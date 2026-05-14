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
    <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #0b3c5d;">${escapeHtml(r.id_notificacion || `${r.rit}-${r.año}`)}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600; color: #1f6f8b;">${escapeHtml(r.codigo || '')}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #374151;">${escapeHtml(r.hora || '')}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; color: #6b7280; font-size: 13px;">${escapeHtml(r.observacion || '—')}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600; color: ${r.es_no_urbana ? '#7c2d12' : '#065f46'};">${r.es_no_urbana ? 'Rural' : 'Urbana'}</td>
      <td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">${escapeHtml(r.geolocalizacion_fuente || 'manual')}</td>
    </tr>
  `
    )
    .join('')

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; background: #f9fafb; padding: 32px 16px;">
      <div style="max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0b3c5d 0%, #1f6f8b 100%); color: #fff; padding: 32px 28px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; margin-bottom: 8px;">Poder Judicial</div>
          <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; line-height: 1.2;">Reporte de Cierre de Carga</h1>
          <div style="font-size: 14px; opacity: 0.9;">Fecha: <strong>${escapeHtml(fecha)}</strong></div>
        </div>

        <!-- Content -->
        <div style="padding: 32px 28px;">
          
          <!-- Resumen Section -->
          <div style="margin-bottom: 36px;">
            <h2 style="margin: 0 0 24px; font-size: 16px; font-weight: 700; color: #0b3c5d; text-transform: uppercase; letter-spacing: 0.5px;">Resumen de la Carga</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div style="background: #f0f4f8; border-left: 4px solid #1f6f8b; padding: 16px;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">Carga Total</div>
                <div style="font-size: 28px; font-weight: 700; color: #0b3c5d;">${formatNumber(resumen.carga_total)}</div>
              </div>
              <div style="background: #f0f4f8; border-left: 4px solid #1f6f8b; padding: 16px;">
                <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">Puntos (Direcciones)</div>
                <div style="font-size: 28px; font-weight: 700; color: #0b3c5d;">${formatNumber(resumen.puntos)}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px;">
              <div style="text-align: center; padding: 12px; background: #f5f3ff; border-radius: 6px;">
                <div style="font-size: 11px; color: #7c3aed; font-weight: 600; margin-bottom: 6px;">Exitosas</div>
                <div style="font-size: 22px; font-weight: 700; color: #7c3aed;">${formatNumber(resumen.exitosas)}</div>
              </div>
              <div style="text-align: center; padding: 12px; background: #fef3c7; border-radius: 6px;">
                <div style="font-size: 11px; color: #b45309; font-weight: 600; margin-bottom: 6px;">Búsqueda</div>
                <div style="font-size: 22px; font-weight: 700; color: #b45309;">${formatNumber(resumen.busqueda)}</div>
              </div>
              <div style="text-align: center; padding: 12px; background: #fee2e2; border-radius: 6px;">
                <div style="font-size: 11px; color: #dc2626; font-weight: 600; margin-bottom: 6px;">Negativas</div>
                <div style="font-size: 22px; font-weight: 700; color: #dc2626;">${formatNumber(resumen.negativas)}</div>
              </div>
              <div style="text-align: center; padding: 12px; background: #e0f2fe; border-radius: 6px;">
                <div style="font-size: 11px; color: #0284c7; font-weight: 600; margin-bottom: 6px;">Otros</div>
                <div style="font-size: 22px; font-weight: 700; color: #0284c7;">${formatNumber(resumen.otros)}</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; border-radius: 4px;">
                <div style="font-size: 12px; color: #4b5563; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">Urbanas</div>
                <div style="font-size: 24px; font-weight: 700; color: #16a34a;">${formatNumber(resumen.urbanas)}</div>
              </div>
              <div style="background: #fef5e7; border-left: 4px solid #d97706; padding: 16px; border-radius: 4px;">
                <div style="font-size: 12px; color: #4b5563; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px;">Rurales</div>
                <div style="font-size: 24px; font-weight: 700; color: #d97706;">${formatNumber(resumen.rurales)}</div>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 32px 0;" />

          <!-- Registros Section -->
          <div>
            <h2 style="margin: 0 0 20px; font-size: 16px; font-weight: 700; color: #0b3c5d; text-transform: uppercase; letter-spacing: 0.5px;">Notificaciones Sacadas a Terreno</h2>
            <div style="overflow-x: auto; border-radius: 6px; border: 1px solid #e5e7eb;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                  <tr style="background: #0b3c5d; color: #fff;">
                    <th style="padding: 14px; text-align: left; font-weight: 700; border: 1px solid #0a2b47;">ID / RIT</th>
                    <th style="padding: 14px; text-align: left; font-weight: 700; border: 1px solid #0a2b47;">Código</th>
                    <th style="padding: 14px; text-align: left; font-weight: 700; border: 1px solid #0a2b47;">Hora</th>
                    <th style="padding: 14px; text-align: left; font-weight: 700; border: 1px solid #0a2b47;">Observación</th>
                    <th style="padding: 14px; text-align: center; font-weight: 700; border: 1px solid #0a2b47;">Tipo</th>
                    <th style="padding: 14px; text-align: center; font-weight: 700; border: 1px solid #0a2b47;">Geo</th>
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
        <div style="background: #f9fafb; padding: 20px 28px; text-align: center; border-top: 1px solid #e5e7eb;">
          <div style="font-size: 12px; color: #9ca3af;">
            Este reporte fue generado automáticamente • ${escapeHtml(fecha)}
          </div>
        </div>

      </div>
    </div>
  `

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      text,
      html,
    }),
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