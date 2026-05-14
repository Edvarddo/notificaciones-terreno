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
  // Generate a simple PDF version of the report and attach it to the email
  const generatePdf = async (registros: RegistroTerreno[], resumen: ResumenCarga, fecha: string) => {
    const pdfDoc = await PDFDocument.create()
    const pageSize = { width: 595.28, height: 841.89 } // A4 in points
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    let page = pdfDoc.addPage([pageSize.width, pageSize.height])
    const margin = 40
    let y = pageSize.height - margin

    const drawText = (text: string, size = 12, color = rgb(0.13, 0.2, 0.26), options: any = {}) => {
      page.drawText(text, { x: margin, y, size, font: helvetica, color, ...options })
      y -= size + 6
    }

    // Header
    drawText(`Reporte de cierre - ${fecha}`, 16)
    y -= 6

    // Resumen
    drawText(`Carga total: ${formatNumber(resumen.carga_total)}`, 12)
    drawText(`Puntos (direcciones): ${formatNumber(resumen.puntos)}`, 12)
    drawText(`Urbanas: ${formatNumber(resumen.urbanas)}    Rurales: ${formatNumber(resumen.rurales)}`, 12)
    drawText(`Exitosas: ${formatNumber(resumen.exitosas)}    Búsqueda: ${formatNumber(resumen.busqueda)}`, 12)

    y -= 6
    drawText('Detalle de notificaciones:', 13)

    // Table header
    const cols = [120, 220, 300, 420, 480]
    const headerFontSize = 11
    page.drawText('ID', { x: margin, y: y, size: headerFontSize, font: helvetica, color: rgb(0.2,0.2,0.2) })
    page.drawText('CÓDIGO', { x: margin + cols[0], y: y, size: headerFontSize, font: helvetica, color: rgb(0.2,0.2,0.2) })
    page.drawText('HORA', { x: margin + cols[1], y: y, size: headerFontSize, font: helvetica, color: rgb(0.2,0.2,0.2) })
    page.drawText('OBSERVACIÓN', { x: margin + cols[2], y: y, size: headerFontSize, font: helvetica, color: rgb(0.2,0.2,0.2) })
    page.drawText('TIPO', { x: margin + cols[3], y: y, size: headerFontSize, font: helvetica, color: rgb(0.2,0.2,0.2) })
    y -= headerFontSize + 8

    const rowFontSize = 10
    for (const r of registros) {
      if (y < margin + 60) {
        page = pdfDoc.addPage([pageSize.width, pageSize.height])
        y = pageSize.height - margin
      }

      const idText = (r.id_notificacion || `${r.rit || ''}-${r.año || ''}`).slice(0, 20)
      page.drawText(idText, { x: margin, y, size: rowFontSize, font: helvetica, color: rgb(0,0,0) })
      page.drawText(String(r.codigo || '').slice(0, 15), { x: margin + cols[0], y, size: rowFontSize, font: helvetica, color: rgb(0,0,0) })
      page.drawText(String(r.hora || '').slice(0, 10), { x: margin + cols[1], y, size: rowFontSize, font: helvetica, color: rgb(0,0,0) })
      page.drawText(String(r.observacion || '—').slice(0, 50), { x: margin + cols[2], y, size: rowFontSize, font: helvetica, color: rgb(0,0,0) })
      page.drawText(r.es_no_urbana ? 'Rural' : 'Urbana', { x: margin + cols[3], y, size: rowFontSize, font: helvetica, color: rgb(0,0,0) })
      y -= rowFontSize + 6
    }

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
})