import { supabase } from '../lib/supabase'

export async function obtenerCargaActiva(fechaCertificacion) {
  const { data, error } = await supabase
    .from('cargas_terreno')
    .select('*')
    .eq('fecha_certificacion', fechaCertificacion)
    .eq('estado', 'activa')
    .order('creada_en', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function crearCargaActiva(fechaCertificacion) {
  // Use Edge Function to create the carga with service role (avoids RLS issues)
  try {
    const res = await supabase.functions.invoke('finalizar-carga', {
      body: JSON.stringify({ action: 'crear_carga', fecha: fechaCertificacion }),
      method: 'POST',
    })

    // supabase.functions.invoke may return a Fetch Response-like object or an object
    // with { data, error }. Normalize both cases.
    let json = null

    if (res && typeof res.json === 'function') {
      json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Error creando carga')
    } else {
      // supabase-js sometimes returns { data, error }
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
  } catch (err) {
    throw err
  }
}

export async function obtenerOCrearCargaActiva(fechaCertificacion) {
  const activa = await obtenerCargaActiva(fechaCertificacion)
  if (activa) return activa

  try {
    return await crearCargaActiva(fechaCertificacion)
  } catch (error) {
    const codigo = String(error?.code || '')
    const mensaje = String(error?.message || '')

    if (codigo === '23505' || /duplicate|unique/i.test(mensaje)) {
      const existente = await obtenerCargaActiva(fechaCertificacion)
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