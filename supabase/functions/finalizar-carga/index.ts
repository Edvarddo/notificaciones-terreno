import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const ACCESS_CODE_FROM_EMAIL = Deno.env.get('ACCESS_CODE_FROM_EMAIL') || 'onboarding@resend.dev'
const ACCESS_CODE_RECIPIENT_EMAILS = Deno.env.get('ACCESS_CODE_RECIPIENT_EMAILS') || 'lalo_13ya@hotmail.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function crearCargaActiva(fecha: string) {
  const { data, error } = await supabase
    .from('cargas_terreno')
    .insert([
      {
        fecha_certificacion: fecha,
        estado: 'activa',
      },
    ])
    .select('*')
    .single()

  if (!error && data) {
    return data
  }

  const { data: activaExistente, error: errorBusqueda } = await supabase
    .from('cargas_terreno')
    .select('*')
    .eq('fecha_certificacion', fecha)
    .eq('estado', 'activa')
    .order('creada_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!errorBusqueda && activaExistente) {
    return activaExistente
  }

  throw error
}

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'https://localhost:5173',
  'https://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://192.168.1.7:5173',
  'https://192.168.1.7:5174',
  'https://notificaciones-terreno.vercel.app',
])

function buildCorsHeaders(req: Request) {
  const requestOrigin = req.headers.get('origin') ?? ''

  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(requestOrigin)
      ? requestOrigin
      : 'https://notificaciones-terreno.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Allow-Credentials': 'true',
  }
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

type CargaTerreno = {
  id: string
  fecha_certificacion: string
  estado: string
  creada_en?: string
  cerrada_en?: string | null
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

Deno.serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

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
    const TO_EMAILS = ACCESS_CODE_RECIPIENT_EMAILS
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean)

    if (!RESEND_API_KEY || !ACCESS_CODE_FROM_EMAIL || TO_EMAILS.length === 0) {
      return new Response(JSON.stringify({ error: 'Faltan variables de entorno de correo' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let payload: { fecha?: string; carga_id?: string }
    try {
      payload = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const fecha = (payload?.fecha || new Date().toISOString().slice(0, 10)).trim()
    const cargaId = (payload?.carga_id || '').trim()
    const action = (payload?.action || '').trim()

    // If client only wants to create/obtain a carga, handle short-circuit action
    if (action === 'crear_carga') {
      try {
        const nueva = await crearCargaActiva(fecha)
        return new Response(JSON.stringify({ ok: true, nueva_carga: nueva }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'No se pudo crear la carga' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    let consultaRegistros = supabase
      .from('notificaciones_terreno')
      .select('*')

    consultaRegistros = cargaId
      ? consultaRegistros.eq('carga_id', cargaId)
      : consultaRegistros.eq('fecha_certificacion', fecha)

    const { data: registros, error: registrosError } = await consultaRegistros.order('id', { ascending: false })

    if (registrosError) {
      return new Response(JSON.stringify({ error: `Error al obtener registros: ${registrosError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const registrosTerreno = (registros || []) as RegistroTerreno[]

    let cargaActiva: CargaTerreno | null = null
    if (cargaId) {
      const { data: cargaEncontrada, error: cargaError } = await supabase
        .from('cargas_terreno')
        .select('*')
        .eq('id', cargaId)
        .maybeSingle()

      if (cargaError || !cargaEncontrada) {
        return new Response(JSON.stringify({ error: 'No se encontró la carga activa a cerrar' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      cargaActiva = cargaEncontrada as CargaTerreno
    }

    // Calcular resumen desde los datos
    const resumen = calcularResumen(registrosTerreno, fecha)

    const etiquetaCarga = cargaId ? `Carga ${cargaId.slice(0, 8)}` : 'Carga del día'

    const subject = `Reporte de cierre - ${fecha} - ${etiquetaCarga}`
    const text = [
      `Reporte de cierre ${fecha}`,
      `Grupo: ${etiquetaCarga}`,
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
          <div style="font-size: 13px; opacity: 0.8; margin-top: 6px;">Grupo: <strong>${escapeHtml(etiquetaCarga)}</strong></div>
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

    if (cargaId && cargaActiva) {
      const { error: cerrarError } = await supabase
        .from('cargas_terreno')
        .update({
          estado: 'cerrada',
          cerrada_en: new Date().toISOString(),
        })
        .eq('id', cargaActiva.id)

      if (cerrarError) {
        return new Response(JSON.stringify({ error: `No se pudo cerrar la carga: ${cerrarError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const nuevaCarga = await crearCargaActiva(fecha)

    const resendBody: any = {
      from: ACCESS_CODE_FROM_EMAIL,
      to: TO_EMAILS,
      subject,
      text,
      html,
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

    return new Response(JSON.stringify({ ok: true, id: resendJson?.id || null, nueva_carga: nuevaCarga }), {
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