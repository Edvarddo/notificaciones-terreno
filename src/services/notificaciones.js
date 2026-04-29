import { supabase } from '../lib/supabase'

export async function obtenerRegistros(fechaCertificacion) {
  const { data, error } = await supabase
    .from('notificaciones_terreno')
    .select('*')
    .eq('fecha_certificacion', fechaCertificacion)
    .order('id', { ascending: false })

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

export async function obtenerEstadisticas(fechaCertificacion) {
  const { data, error } = await supabase
    .from('notificaciones_terreno')
    .select('id,codigo_lote')
    .eq('fecha_certificacion', fechaCertificacion)

  if (error) throw error

  const registros = data || []
  const cargaTotal = registros.length
  const lotesVistos = new Set()

  const puntos = registros.reduce((total, registro) => {
    const codigoLote = String(registro?.codigo_lote ?? '').trim().toUpperCase()

    if (!codigoLote) return total + 1
    if (lotesVistos.has(codigoLote)) return total

    lotesVistos.add(codigoLote)
    return total + 1
  }, 0)

  return {
    cargaTotal,
    puntos,
  }
}