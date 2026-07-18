import { supabase } from '../lib/supabase'
export async function obtenerCargaActiva(fechaCertificacion, userId) {
  const { data, error } = await supabase
    .from('cargas_terreno')
    .select('*')
    .eq('fecha_certificacion', fechaCertificacion)
    .eq('user_id', userId)
    .eq('estado', 'activa')
    .order('creada_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log('[obtenerCargaActiva]', {
    fechaCertificacion,
    userId,
    data,
    error,
  })

  if (error) throw error

  return data || null
}

export async function obtenerUltimaCargaFinalizada(fechaCertificacion) {
  const { data, error } = await supabase
    .from('cargas_terreno')
    .select('id, creada_en, cerrada_en, estado, fecha_certificacion')
    .eq('fecha_certificacion', fechaCertificacion)
    .eq('estado', 'cerrada')
    .order('cerrada_en', { ascending: false, nullsFirst: false })
    .order('creada_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function crearCargaActiva(fechaCertificacion, userId) {
  const res = await supabase.functions.invoke('finalizar-carga', {
    body: JSON.stringify({
      action: 'crear_carga',
      fecha: fechaCertificacion,
      user_id: userId,
    }),
    method: 'POST',
  })

  let json = null

  if (res && typeof res.json === 'function') {
    json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Error creando carga')
  } else {
    if (res?.error) throw res.error
    const payload = res?.data ?? res

    try {
      if (payload instanceof Uint8Array) {
        json = JSON.parse(new TextDecoder().decode(payload))
      } else if (typeof payload === 'string') {
        json = JSON.parse(payload)
      } else {
        json = payload
      }
    } catch (e) {
      json = payload
    }

    if (json?.error) throw new Error(json.error)
  }

  return json?.nueva_carga ?? json
}

export async function obtenerOCrearCargaActiva(fechaCertificacion, userId) {
  const activa = await obtenerCargaActiva(fechaCertificacion, userId)

  if (activa) return activa

  try {
    return await crearCargaActiva(fechaCertificacion, userId)
  } catch (error) {
    const codigo = String(error?.code || '')
    const mensaje = String(error?.message || '')

    if (codigo === '23505' || /duplicate|unique/i.test(mensaje)) {
      const existente = await obtenerCargaActiva(fechaCertificacion, userId)
      if (existente) return existente
    }

    throw error
  }
}

export async function obtenerRegistros(fechaCertificacion, cargaId = null) {
  let query = supabase
    .from('notificaciones_terreno')
    .select('*')
    .eq('fecha_certificacion', fechaCertificacion)

  if (cargaId) {
    query = query.eq('carga_id', cargaId)
  }

  const { data, error } = await query.order('id', { ascending: false })

  if (error) throw error
  return data
}

export async function insertarRegistro(fila) {
  const { error } = await supabase.from('notificaciones_terreno').insert([fila])
  if (error) throw error
}

export async function insertarLote(filas) {
  const { error } = await supabase
    .from('notificaciones_terreno')
    .insert(
      filas.map((f) => ({
        ...f,
        codigo_lote: f.codigo_lote ?? null,
      }))
    )
  if (error) throw error
}

export async function eliminarRegistroPorId(id) {
  const { error } = await supabase
    .from('notificaciones_terreno')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function existeIdNotificacionEnFecha(idNotificacion, fechaCertificacion) {
  const { data, error } = await supabase
    .from('notificaciones_terreno')
    .select('id')
    .eq('id_notificacion', idNotificacion)
    .eq('fecha_certificacion', fechaCertificacion)
    .limit(1)

  if (error) throw error
  return (data?.length || 0) > 0
}

export async function actualizarRegistroPorId(id, cambios) {
  const { error } = await supabase
    .from('notificaciones_terreno')
    .update(cambios)
    .eq('id', id)

  if (error) throw error
}

export async function obtenerEstadisticas(fechaCertificacion, cargaId = null) {
  let query = supabase
    .from('notificaciones_terreno')
    .select('codigo_lote, es_no_urbana')
    .eq('fecha_certificacion', fechaCertificacion)

  if (cargaId) {
    query = query.eq('carga_id', cargaId)
  }

  const { data, error } = await query

  if (error) throw error

  const registros = data || []
  const cargaTotal = registros.length
  const lotesAgrupados = new Map()

  for (const registro of registros) {
    const codigoLote = String(registro?.codigo_lote ?? '').trim().toUpperCase()

    if (!codigoLote) {
      continue
    }

    if (!lotesAgrupados.has(codigoLote)) {
      lotesAgrupados.set(codigoLote, {
        esNoUrbana: Boolean(registro?.es_no_urbana),
      })
      continue
    }

    const loteExistente = lotesAgrupados.get(codigoLote)
    loteExistente.esNoUrbana = loteExistente.esNoUrbana || Boolean(registro?.es_no_urbana)
  }

  const puntos = lotesAgrupados.size
  const rurales = [...lotesAgrupados.values()].filter((lote) => lote.esNoUrbana).length
  const urbanas = Math.max(puntos - rurales, 0)

  return {
    cargaTotal,
    puntos,
    rurales,
    urbanas,
  }
}

export async function obtenerTodasLasCargasDeUnDia(fechaCertificacion) {
  const { data, error } = await supabase
    .from('cargas_terreno')
    .select('id, creada_en, cerrada_en, estado, fecha_certificacion, user_id')
    .eq('fecha_certificacion', fechaCertificacion)
    .order('creada_en', { ascending: true })
    .order('id', { ascending: true })

  console.log('[CARGAS] fecha', fechaCertificacion)
  console.log('[CARGAS] resultado', data)
  if (error) throw error
  return data || []
}

export async function obtenerCargaPorId(cargaId) {
  const { data, error } = await supabase
    .from('cargas_terreno')
    .select('id, estado, cerrada_en')
    .eq('id', cargaId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

// 

export async function obtenerResumenNotificaciones({ año, mes, dia = '' }) {
  const inicio = dia
    ? `${año}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    : `${año}-${String(mes).padStart(2, '0')}-01`

  const fin = dia
    ? inicio
    : new Date(Number(año), Number(mes), 0).toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('notificaciones_terreno')
    .select('id, fecha_certificacion, codigo_lote, es_no_urbana')
    .gte('fecha_certificacion', inicio)
    .lte('fecha_certificacion', fin)

  if (error) throw error

  const registros = data || []
  const porDia = new Map()

  for (const r of registros) {
    const fecha = r.fecha_certificacion
    if (!porDia.has(fecha)) {
      porDia.set(fecha, {
        fecha,
        cargaTotal: 0,
        lotes: new Map(),
      })
    }

    const item = porDia.get(fecha)
    item.cargaTotal += 1

    const lote = String(r.codigo_lote || '').trim()
    if (lote && !item.lotes.has(lote)) {
      item.lotes.set(lote, Boolean(r.es_no_urbana))
    }
  }

  const dias = [...porDia.values()].map((item) => {
    const puntos = item.lotes.size
    const rurales = [...item.lotes.values()].filter(Boolean).length
    const urbanas = Math.max(puntos - rurales, 0)

    return {
      fecha: item.fecha,
      cargaTotal: item.cargaTotal,
      puntos,
      urbanas,
      rurales,
    }
  })

  const total = dias.reduce(
    (acc, d) => {
      acc.cargaTotal += d.cargaTotal
      acc.puntos += d.puntos
      acc.urbanas += d.urbanas
      acc.rurales += d.rurales
      return acc
    },
    { cargaTotal: 0, puntos: 0, urbanas: 0, rurales: 0 }
  )

  return {
    inicio,
    fin,
    total,
    dias: dias.sort((a, b) => a.fecha.localeCompare(b.fecha)),
  }
}

export async function eliminarRegistroAuditado({
  id,
  motivo,
  usuarioId,
}) {
  const motivoLimpio = String(motivo ?? '').trim()

  if (!id) {
    throw new Error('No se recibió el ID interno del registro')
  }

  if (!motivoLimpio) {
    throw new Error('El motivo de eliminación es obligatorio')
  }

  if (!usuarioId) {
    throw new Error('No se pudo identificar al usuario de la sesión')
  }

  const { data, error } = await supabase.rpc(
    'eliminar_notificacion_auditada',
    {
      p_id: id,
      p_motivo: motivoLimpio,
      p_usuario_id: usuarioId,
    }
  )

  if (error) {
    throw error
  }

  return data
}