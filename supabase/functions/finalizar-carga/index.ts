const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type ResumenCarga = {
  fecha_certificacion?: string
  carga_total?: number
  puntos?: number
  urbanas?: number
  rurales?: number
  total_notificaciones?: number
  exitosas?: number
  busqueda?: number
  negativas?: number
  otros?: number
}

type RegistroTerreno = {
  id?: number
  id_notificacion?: string
  rit?: string
  año?: number
  codigo?: string
  codigo_lote?: string
  hora?: string
  observacion?: string
  es_no_urbana?: boolean
  latitud?: number
  longitud?: number
  geolocalizacion_fuente?: string
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const formatNumber = (value: unknown) => Number(value ?? 0).toLocaleString('es-CL')

const calcularResumen = (registros: RegistroTerreno[], fecha: string): ResumenCarga => {
  const resumenPorCodigo = registros.reduce(
    (acc, registro) => {
      const codigo = String(registro?.codigo ?? '').trim().toUpperCase()
      acc.total += 1

      if (['D2', 'D4', 'E1'].includes(codigo)) acc.exitosas += 1
      else if (['B3', 'B7', 'B10'].includes(codigo)) acc.busqueda += 1
      else if (['A1', 'A2', 'A3', 'B5'].includes(codigo)) acc.negativas += 1
      else acc.otros += 1

      return acc
    },
    { total: 0, exitosas: 0, busqueda: 0, negativas: 0, otros: 0 }
  )

  // Contar urbanas/rurales y puntos (códigos_lote únicos)
  const lotesAgrupados = new Map<string, { esNoUrbana: boolean }>()
  for (const registro of registros) {
    const codigoLote = String(registro?.codigo_lote ?? '').trim().toUpperCase()
    if (codigoLote) {
      if (!lotesAgrupados.has(codigoLote)) {
        lotesAgrupados.set(codigoLote, { esNoUrbana: Boolean(registro?.es_no_urbana) })
      } else {
        const lote = lotesAgrupados.get(codigoLote)!
        lote.esNoUrbana = lote.esNoUrbana || Boolean(registro?.es_no_urbana)
      }
    }
  }

  const puntos = lotesAgrupados.size
  const rurales = [...lotesAgrupados.values()].filter((lote) => lote.esNoUrbana).length
  const urbanas = Math.max(puntos - rurales, 0)

  return {
    fecha_certificacion: fecha,
    carga_total: registros.length,
    puntos,
    urbanas,
    rurales,
    total_notificaciones: resumenPorCodigo.total,
    exitosas: resumenPorCodigo.exitosas,
    busqueda: resumenPorCodigo.busqueda,
    negativas: resumenPorCodigo.negativas,
    otros: resumenPorCodigo.otros,
  }
}

// Import Supabase client
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// PDF generation (pure JS, works in Deno)
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    const FROM_EMAIL = Deno.env.get('ACCESS_CODE_FROM_EMAIL')
    const TO_EMAIL = Deno.env.get('ACCESS_CODE_RECIPIENT_EMAIL')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!RESEND_API_KEY || !FROM_EMAIL || !TO_EMAIL) {
      return new Response(JSON.stringify({ error: 'Faltan variables de entorno de correo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Faltan variables de entorno de Supabase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let payload: { fecha?: string }
    try {
      payload = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fecha = (payload?.fecha || new Date().toISOString().slice(0, 10)).trim()

    // Conectar a Supabase y obtener registros del día
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: registros, error: registrosError } = await supabase
      .from('notificaciones_terreno')
      .select('*')
      .eq('fecha_certificacion', fecha)
      .order('id', { ascending: false })

    if (registrosError) {
      return new Response(JSON.stringify({ error: `Error al obtener registros: ${registrosError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const registrosTerreno = (registros || []) as RegistroTerreno[]

    // Calcular resumen desde los datos
    const resumen = calcularResumen(registrosTerreno, fecha)

    const subject = `Reporte de cierre - ${fecha}`
    const text = [
      `Reporte de cierre ${fecha}`,
      `Carga total: ${formatNumber(resumen.carga_total)}`,
      `Puntos (direcciones): ${formatNumber(resumen.puntos)}`,
      `Total notificaciones hechas: ${formatNumber(resumen.total_notificaciones)}`,
      `Exitosas / realizadas: ${formatNumber(resumen.exitosas)}`,
      `Búsqueda / pendientes: ${formatNumber(resumen.busqueda)}`,
      `Negativas / concluidas: ${formatNumber(resumen.negativas)}`,
      `Urbanas: ${formatNumber(resumen.urbanas)}`,
      `Rurales: ${formatNumber(resumen.rurales)}`,
      '',
      'Notificaciones sacadas a terreno:',
      ...registrosTerreno.map(r => `- ${r.id_notificacion || `${r.rit}-${r.año}`} [${r.codigo}] ${r.es_no_urbana ? 'Rural' : 'Urbana'}`),
    ].join('\n')

    const registrosHtml = registrosTerreno
    .map(
      (r, idx) => `
    <tr>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; color: #0b3c5d; font-weight: 600;">${escapeHtml(r.id_notificacion || `${r.rit}-${r.año}`)}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; color: #1f6f8b; font-weight: 600;">${escapeHtml(r.codigo || '')}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; color: #374151;">${escapeHtml(r.hora || '')}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(r.observacion || '—')}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: ${r.es_no_urbana ? '#92400e' : '#047857'}; background: ${r.es_no_urbana ? '#fef3c7' : '#f0fdf4'};">${r.es_no_urbana ? 'Rural' : 'Urbana'}</td>
      <td style="padding: 14px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; background: #f3f4f6;">${escapeHtml(r.geolocalizacion_fuente || 'manual')}</td>
    </tr>
  `
    )
    .join('')

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; background: #ffffff;">
      
      <!-- Header Band -->
      <div style="background: linear-gradient(135deg, #0b3c5d 0%, #1f6f8b 100%); color: #fff; padding: 40px 32px;">
        <div style="max-width: 900px; margin: 0 auto;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; margin-bottom: 12px;">Poder Judicial</div>
          <h1 style="margin: 0 0 8px; font-size: 32px; font-weight: 700;">Reporte de Cierre</h1>
          <div style="font-size: 15px; opacity: 0.9;">Fecha: <strong>${escapeHtml(fecha)}</strong></div>
        </div>
      </div>

      <!-- Main Content -->
      <div style="background: #f9fafb; padding: 40px 32px;">
        <div style="max-width: 900px; margin: 0 auto;">
          
          <!-- Resumen KPIs - Cards (email-friendly, larger) -->
          <div style="margin-bottom: 36px; text-align: center; font-size: 0;">
            <div style="display: inline-block; width: 200px; margin: 12px; background: #fff; padding: 20px; border-radius: 8px; vertical-align: top; box-shadow: 0 2px 6px rgba(16,24,40,0.06);">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Carga</div>
              <div style="font-size: 30px; font-weight: 800; color: #0b3c5d;">${formatNumber(resumen.carga_total)}</div>
            </div>
            <div style="display: inline-block; width: 200px; margin: 12px; background: #fff; padding: 20px; border-radius: 8px; vertical-align: top; box-shadow: 0 2px 6px rgba(16,24,40,0.06);">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Puntos</div>
              <div style="font-size: 30px; font-weight: 800; color: #0b3c5d;">${formatNumber(resumen.puntos)}</div>
            </div>
            <div style="display: inline-block; width: 200px; margin: 12px; background: #fff; padding: 20px; border-radius: 8px; vertical-align: top; box-shadow: 0 2px 6px rgba(16,24,40,0.06);">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Urbanas</div>
              <div style="font-size: 30px; font-weight: 800; color: #047857;">${formatNumber(resumen.urbanas)}</div>
            </div>
            <div style="display: inline-block; width: 200px; margin: 12px; background: #fff; padding: 20px; border-radius: 8px; vertical-align: top; box-shadow: 0 2px 6px rgba(16,24,40,0.06);">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Rurales</div>
              <div style="font-size: 30px; font-weight: 800; color: #d97706;">${formatNumber(resumen.rurales)}</div>
            </div>
            <div style="display: inline-block; width: 200px; margin: 12px; background: #fff; padding: 20px; border-radius: 8px; vertical-align: top; box-shadow: 0 2px 6px rgba(16,24,40,0.06);">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Exitosas</div>
              <div style="font-size: 30px; font-weight: 800; color: #7c3aed;">${formatNumber(resumen.exitosas)}</div>
            </div>
            <div style="display: inline-block; width: 200px; margin: 12px; background: #fff; padding: 20px; border-radius: 8px; vertical-align: top; box-shadow: 0 2px 6px rgba(16,24,40,0.06);">
              <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px;">Búsqueda</div>
              <div style="font-size: 30px; font-weight: 800; color: #f59e0b;">${formatNumber(resumen.busqueda)}</div>
            </div>
          </div>

          <!-- Table Section -->
          <div style="background: #fff; border-radius: 6px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="padding: 20px 24px; border-bottom: 2px solid #e5e7eb;">
              <h3 style="margin: 0; font-size: 14px; font-weight: 700; color: #0b3c5d; text-transform: uppercase; letter-spacing: 0.5px;">Detalle de Notificaciones</h3>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db; letter-spacing: 0.3px;">ID</th>
                  <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db; letter-spacing: 0.3px;">CÓDIGO</th>
                  <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db; letter-spacing: 0.3px;">HORA</th>
                  <th style="padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db; letter-spacing: 0.3px;">OBSERVACIÓN</th>
                  <th style="padding: 14px 16px; text-align: center; font-size: 12px; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db; letter-spacing: 0.3px;">TIPO</th>
                  <th style="padding: 14px 16px; text-align: center; font-size: 12px; font-weight: 700; color: #374151; border-bottom: 2px solid #d1d5db; letter-spacing: 0.3px;">GEO</th>
                </tr>
              </thead>
              <tbody>
                ${registrosHtml}
              </tbody>
            </table>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div style="background: #0b3c5d; color: #fff; padding: 24px 32px; text-align: center; font-size: 12px; opacity: 0.8;">
        Reporte generado automáticamente • ${escapeHtml(fecha)}
      </div>

    </div>
  `
    // Generate a PDF that visually matches the email (header, KPI cards, table)
    const generatePdf = async (registros: RegistroTerreno[], resumen: ResumenCarga, fecha: string) => {
    const pdfDoc = await PDFDocument.create()
    const pageSize = { width: 595.28, height: 841.89 } // A4
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const margin = 36
    const cardWidth = 140
    const cardHeight = 70
    const gap = 12

    let page = pdfDoc.addPage([pageSize.width, pageSize.height])
    let yTop = pageSize.height - margin

    // Header band (solid color similar to email)
    page.drawRectangle({ x: 0, y: pageSize.height - 120, width: pageSize.width, height: 120, color: rgb(0.043, 0.235, 0.365) })
    // center title
    const title = 'Reporte de Cierre'
    const titleSize = 20
    const titleWidth = helveticaBold.widthOfTextAtSize(title, titleSize)
    page.drawText(title, { x: (pageSize.width - titleWidth) / 2, y: pageSize.height - 60, size: titleSize, font: helveticaBold, color: rgb(1, 1, 1) })
    const fechaText = `Fecha: ${fecha}`
    const fechaSize = 11
    const fechaWidth = helvetica.widthOfTextAtSize(fechaText, fechaSize)
    page.drawText(fechaText, { x: (pageSize.width - fechaWidth) / 2, y: pageSize.height - 88, size: fechaSize, font: helvetica, color: rgb(1, 1, 1) })

    // KPIs cards area
    // Center KPI cards
    const kpis = [
      { label: 'Carga', value: resumen.carga_total || 0, color: rgb(0.043, 0.235, 0.365) },
      { label: 'Puntos', value: resumen.puntos || 0, color: rgb(0.043, 0.235, 0.365) },
      { label: 'Urbanas', value: resumen.urbanas || 0, color: rgb(0.0, 0.529, 0.341) },
      { label: 'Rurales', value: resumen.rurales || 0, color: rgb(0.855, 0.471, 0.039) },
      { label: 'Exitosas', value: resumen.exitosas || 0, color: rgb(0.486, 0.239, 0.933) },
      { label: 'Búsqueda', value: resumen.busqueda || 0, color: rgb(0.96, 0.62, 0.075) },
    ]
    // layout: compute how many per row to center nicely (max 3 per row)
    const perRow = 3
    let kpiIndex = 0
    let kpiRowY = pageSize.height - 150
    while (kpiIndex < kpis.length) {
      const row = kpis.slice(kpiIndex, kpiIndex + perRow)
      let startX = (pageSize.width - (row.length * cardWidth + (row.length - 1) * gap)) / 2
      for (const kpi of row) {
        page.drawRectangle({ x: startX, y: kpiRowY - cardHeight, width: cardWidth, height: cardHeight, color: rgb(1, 1, 1), borderColor: rgb(0.9, 0.9, 0.9), borderWidth: 0.5 })
        const labelSize = 9
        const labelWidth = helveticaBold.widthOfTextAtSize(kpi.label, labelSize)
        page.drawText(kpi.label, { x: startX + 10, y: kpiRowY - 28, size: labelSize, font: helveticaBold, color: rgb(0.42, 0.46, 0.52) })
        const valueStr = String(formatNumber(kpi.value))
        const valueSize = 16
        page.drawText(valueStr, { x: startX + 10, y: kpiRowY - 50, size: valueSize, font: helveticaBold, color: kpi.color })
        startX += cardWidth + gap
      }
      kpiIndex += perRow
      kpiRowY -= cardHeight + 18
    }

    // Move to table area
    let tableY = yTop - cardHeight - 20
    if (tableY < 200) {
      page = pdfDoc.addPage([pageSize.width, pageSize.height])
      tableY = pageSize.height - margin - 40
    }

    // Table header background + improved visuals (alternating row shading and column separators)
    const tableX = margin
    const tableWidth = pageSize.width - margin * 2
    const colWidths = [120, 80, 70, tableWidth - 120 - 80 - 70 - 80, 80] // ID, CÓDIGO, HORA, OBS, TIPO
    const headerHeight = 24
    page.drawRectangle({ x: tableX, y: tableY - headerHeight, width: tableWidth, height: headerHeight, color: rgb(0.956, 0.958, 0.96) })
    // headers centered/left-friendly
    let hx = tableX + 8
    const headerFontSize = 11
    const headers = ['ID', 'CÓDIGO', 'HORA', 'OBSERVACIÓN', 'TIPO']
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x: hx, y: tableY - 18, size: headerFontSize, font: helveticaBold, color: rgb(0.2, 0.2, 0.2) })
      // vertical separator
      const sepX = tableX + colWidths.slice(0, i + 1).reduce((s, v) => s + v, 0)
      page.drawLine({ start: { x: sepX, y: tableY - headerHeight }, end: { x: sepX, y: tableY + 6 }, thickness: 0.5, color: rgb(0.88, 0.88, 0.88) })
      hx += colWidths[i]
    }

    // rows with alternating background
    let tableRowY = tableY - headerHeight - 10
    const rowFontSize = 10
    let rowIdx = 0
    for (const r of registros) {
      if (tableRowY < margin + 40) {
        page = pdfDoc.addPage([pageSize.width, pageSize.height])
        tableRowY = pageSize.height - margin - 40
      }

      // alternating background
      if (rowIdx % 2 === 1) {
        page.drawRectangle({ x: tableX, y: tableRowY - 6, width: tableWidth, height: rowFontSize + 10, color: rgb(0.98, 0.98, 0.98) })
      }

      let rx = tableX + 8
      const idText = (r.id_notificacion || `${r.rit || ''}-${r.año || ''}`).slice(0, 18)
      page.drawText(idText, { x: rx, y: tableRowY, size: rowFontSize, font: helvetica, color: rgb(0.06, 0.06, 0.06) })
      rx += colWidths[0]

      page.drawText(String(r.codigo || '').slice(0, 12), { x: rx, y: tableRowY, size: rowFontSize, font: helvetica, color: rgb(0.06, 0.06, 0.06) })
      rx += colWidths[1]

      page.drawText(String(r.hora || '').slice(0, 8), { x: rx, y: tableRowY, size: rowFontSize, font: helvetica, color: rgb(0.06, 0.06, 0.06) })
      rx += colWidths[2]

      page.drawText(String(r.observacion || '—').slice(0, 80), { x: rx, y: tableRowY, size: rowFontSize, font: helvetica, color: rgb(0.06, 0.06, 0.06) })
      rx += colWidths[3]

      const tipo = r.es_no_urbana ? 'Rural' : 'Urbana'
      page.drawText(tipo, { x: rx, y: tableRowY, size: rowFontSize, font: helveticaBold, color: r.es_no_urbana ? rgb(0.85, 0.38, 0.06) : rgb(0.02, 0.44, 0.31) })

      // bottom row separator
      page.drawLine({ start: { x: tableX, y: tableRowY - 8 }, end: { x: tableX + tableWidth, y: tableRowY - 8 }, thickness: 0.4, color: rgb(0.92, 0.92, 0.92) })

      tableRowY -= rowFontSize + 14
      rowIdx += 1
    }

    // Footer small text
    page.drawText(`Reporte generado automáticamente • ${fecha}`, { x: margin, y: margin - 4, size: 9, font: helvetica, color: rgb(0.5, 0.5, 0.5) })

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
  }

    let attachmentBase64: string | null = null
    try {
      const pdfBytes = await generatePdf(registrosTerreno, resumen, fecha)
      // base64 encode
      let binary = ''
      const bytes = new Uint8Array(pdfBytes)
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
      attachmentBase64 = btoa(binary)
    } catch (e) {
      // If PDF generation fails, continue without attachment
      console.error('PDF generation failed', e)
      attachmentBase64 = null
    }

    const resendBody: any = {
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      text,
      html,
    }

    if (attachmentBase64) {
      resendBody.attachments = [
        {
          filename: `reporte-${fecha}.pdf`,
          content: attachmentBase64,
          type: 'application/pdf',
        },
      ]
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resendBody),
    })

    const resendJson = await resendResponse.json().catch(() => ({}))
    if (!resendResponse.ok) {
      return new Response(JSON.stringify({ error: resendJson?.message || 'No se pudo enviar el correo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, id: resendJson?.id || null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('finalizar-carga unexpected error', error)
    const message = error instanceof Error ? error.message : 'Error inesperado en la función'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})