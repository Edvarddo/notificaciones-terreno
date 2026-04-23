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
  const { error } = await supabase.from('notificaciones_terreno').insert(filas)
  if (error) throw error
}

export async function eliminarRegistroPorId(id) {
  const { error } = await supabase
    .from('notificaciones_terreno')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function existeIdNotificacion(idNotificacion) {
  const { data, error } = await supabase
    .from('notificaciones_terreno')
    .select('id')
    .eq('id_notificacion', idNotificacion)
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