import { useEffect, useState } from 'react'
import {
  obtenerRegistros,
  insertarRegistro,
  insertarLote,
  eliminarRegistroPorId,
  existeIdNotificacionEnFecha,
  actualizarRegistroPorId,
} from '../services/notificaciones'
import {
  agregarOperacionPendiente,
  obtenerOperacionesPendientes,
  eliminarOperacionPendiente,
} from '../lib/offlineQueue'

function useNotificaciones({ fechaCertificacion, enfocarId }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(false)
  const [guardandoLote, setGuardandoLote] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [estadisticas, setEstadisticas] = useState({ puntos: 0 })

  const esErrorDeRed = (error) => {
    const mensaje = String(error?.message || error || '')
    return (
      !navigator.onLine ||
      /fetch|network|failed to fetch|networkerror|load failed/i.test(mensaje)
    )
  }

  const sincronizarPendientes = async () => {
    if (!navigator.onLine) return

    const pendientes = await obtenerOperacionesPendientes().catch(() => [])
    if (!pendientes.length) return

    let sincronizados = 0

    for (const pendiente of pendientes) {
      if (pendiente.tipo !== 'guardarRegistro') continue

      try {
        await insertarRegistro(pendiente.payload)
        await eliminarOperacionPendiente(pendiente.id)
        sincronizados += 1
      } catch (error) {
        if (/duplicate|unique/i.test(String(error?.message || ''))) {
          await eliminarOperacionPendiente(pendiente.id)
          sincronizados += 1
        }
      }
    }

    if (sincronizados > 0) {
      setMensaje(`Sincronizados ${sincronizados} registro(s) pendientes`)
      await cargar()
    }
  }

  useEffect(() => {
    sincronizarPendientes()

    const manejarOnline = () => {
      sincronizarPendientes().catch(() => {})
    }

    window.addEventListener('online', manejarOnline)
    return () => window.removeEventListener('online', manejarOnline)
  }, [])

  const limpiarMensajes = () => {
    setMensaje('')
    setErrorMsg('')
    setMensajes([])
  }

    const cargar = async () => {
    try {
        const data = await obtenerRegistros(fechaCertificacion)
        setRegistros(data)
    } catch (error) {
        setErrorMsg(`No se pudieron cargar los registros: ${error.message}`)
    }
    }

  const guardarRegistro = async ({
    idNotificacion,
    codigo,
    observacion,
    esNoUrbana,
  }) => {
    limpiarMensajes()

    const idLimpio = idNotificacion.trim()
    const codigoLimpio = codigo.trim().toUpperCase()
    const observacionLimpia = observacion.trim() || '.'

    if (!/^\d{1,8}$/.test(idLimpio)) {
      const msg = 'El ID debe ser numerico y maximo 8 digitos'
      setErrorMsg(msg)
      enfocarId?.()
      return { ok: false, error: msg }
    }

    if (!codigoLimpio) {
      const msg = 'Ingresa o selecciona el codigo'
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    try {
      const yaExiste = await existeIdNotificacionEnFecha(idLimpio, fechaCertificacion)
      if (yaExiste) {
        const msg = 'Ya existe un registro con esa ID de notificacion'
        setErrorMsg(msg)
        enfocarId?.()
        return { ok: false, error: msg }
      }
    } catch (error) {
      if (esErrorDeRed(error)) {
        try {
          await agregarOperacionPendiente({
            tipo: 'guardarRegistro',
            payload: {
              id_notificacion: idLimpio,
              fecha_certificacion: fechaCertificacion,
              hora: new Date()
                .toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                })
                .replace(':', ''),
              codigo: codigoLimpio,
              observacion: observacionLimpia,
              es_no_urbana: Boolean(esNoUrbana),
            },
          })
        } catch (queueError) {
          const msg = `No se pudo guardar sin conexion: ${queueError.message}`
          setErrorMsg(msg)
          return { ok: false, error: msg }
        }

        setMensaje('Sin conexion: registro pendiente de sincronizacion')
        enfocarId?.()
        return { ok: true, offline: true }
      }

      const msg = `No se pudo validar la ID: ${error.message}`
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    setCargando(true)

    const ahora = new Date()
    const hora = ahora
      .toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      .replace(':', '')

    try {
      await insertarRegistro({
        id_notificacion: idLimpio,
        fecha_certificacion: fechaCertificacion,
        hora,
        codigo: codigoLimpio,
        observacion: observacionLimpia,
        es_no_urbana: Boolean(esNoUrbana),
      })
    } catch (error) {
      setCargando(false)

      if (esErrorDeRed(error)) {
        try {
          await agregarOperacionPendiente({
            tipo: 'guardarRegistro',
            payload: {
              id_notificacion: idLimpio,
              fecha_certificacion: fechaCertificacion,
              hora,
              codigo: codigoLimpio,
              observacion: observacionLimpia,
              es_no_urbana: Boolean(esNoUrbana),
            },
          })
        } catch (queueError) {
          const msg = `No se pudo guardar sin conexion: ${queueError.message}`
          setErrorMsg(msg)
          return { ok: false, error: msg }
        }

        setMensaje('Sin conexion: registro pendiente de sincronizacion')
        enfocarId?.()
        return { ok: true, offline: true }
      }

      const msg = error.message?.toLowerCase().includes('duplicate')
        ? 'Ya existe un registro con esa ID de notificacion'
        : `Error al guardar: ${error.message}`

      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    setCargando(false)
    setMensaje('Guardado')
    await cargar()
    enfocarId?.()
    return { ok: true }
  }

  const eliminarUltimoRegistro = async () => {
    limpiarMensajes()

    if (!registros.length) {
      const msg = 'No hay registros para eliminar'
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    const ultimo = registros[0]
    try {
      await eliminarRegistroPorId(ultimo.id)
    } catch (error) {
      const msg = `No se pudo eliminar: ${error.message}`
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    setMensaje('Eliminado')
    await cargar()
    enfocarId?.()
    return { ok: true }
  }

  const guardarLoteRegistros = async ({
    idsTemporales,
    horaLote,
    codigoLote,
    observacionLote,
    esNoUrbanaLote,
    onSuccess,
    onBeforeError,
  }) => {
    limpiarMensajes()

    if (idsTemporales.length === 0) {
      const msg = 'No hay IDs en el lote'
      setErrorMsg(msg)
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    const idsNormalizados = idsTemporales.map((id) => String(id).trim())

    const idsInvalidos = idsNormalizados.filter((id) => !/^\d{1,8}$/.test(id))
    if (idsInvalidos.length > 0) {
      const msg = `Hay IDs invalidas en el lote: ${idsInvalidos.join(', ')}`
      setErrorMsg(msg)
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    const idsDuplicadasEnLote = idsNormalizados.filter(
      (id, index) => idsNormalizados.indexOf(id) !== index
    )

    if (idsDuplicadasEnLote.length > 0) {
      const unicas = [...new Set(idsDuplicadasEnLote)]
      const msg = `No se puede guardar el lote porque hay IDs repetidas en el lote: ${unicas.join(', ')}`
      setErrorMsg(msg)
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    if (horaLote.length !== 4) {
      const msg = 'La hora del lote debe tener 4 digitos, por ejemplo 1435'
      setErrorMsg(msg)
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    const codigoNormalizado = codigoLote.trim().toUpperCase()
    if (!codigoNormalizado) {
      const msg = 'Ingresa o selecciona el codigo del lote'
      setErrorMsg(msg)
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    const observacionNormalizada = observacionLote.trim() || '.'

    for (const id of idsNormalizados) {
      try {
        const yaExiste = await existeIdNotificacionEnFecha(id, fechaCertificacion)
        if (yaExiste) {
          const msg = `No se puede guardar el lote porque la ID ${id} ya existe en la base de datos`
          setErrorMsg(msg)
          await onBeforeError?.()
          return { ok: false, error: msg }
        }
      } catch (error) {
        const msg = `No se pudo validar la ID ${id}: ${error.message}`
        setErrorMsg(msg)
        await onBeforeError?.()
        return { ok: false, error: msg }
      }
    }

    setGuardandoLote(true)

    const filas = idsNormalizados.map((id) => ({
      id_notificacion: id,
      fecha_certificacion: fechaCertificacion,
      hora: horaLote,
      codigo: codigoNormalizado,
      observacion: observacionNormalizada,
      es_no_urbana: Boolean(esNoUrbanaLote),
      codigo_lote: codigoNormalizado,
    }))

    try {
      await insertarLote(filas)
    } catch (error) {
      setGuardandoLote(false)

      const msg = error.message?.toLowerCase().includes('duplicate')
        ? 'No se puede guardar el lote porque una o más IDs ya existen'
        : `Error al guardar lote: ${error.message}`

      setErrorMsg(msg)
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    setGuardandoLote(false)
    setMensaje(`Lote guardado: ${idsTemporales.length} registro(s)`)
    await onSuccess?.()
    await cargar()
    return { ok: true }
  }

  const actualizarRegistro = async ({ id, codigo, hora, es_no_urbana }) => {
    limpiarMensajes()

    const codigoLimpio = String(codigo ?? '').trim().toUpperCase()
    const horaLimpia = String(hora ?? '').trim()

    if (!codigoLimpio) {
      const msg = 'El codigo no puede quedar vacio'
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    if (!/^\d{4}$/.test(horaLimpia)) {
      const msg = 'La hora debe tener 4 digitos, por ejemplo 1435'
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    try {
      await actualizarRegistroPorId(id, {
        codigo: codigoLimpio,
        hora: horaLimpia,
        es_no_urbana: Boolean(es_no_urbana),
      })
    } catch (error) {
      const msg = `No se pudo actualizar: ${error.message}`
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    setMensaje('Registro actualizado')
    await cargar()
    return { ok: true }
  }

  return {
    registros,
    cargando,
    guardandoLote,
    mensaje,
    mensajes,
    errorMsg,
    estadisticas,
    setMensaje,
    setErrorMsg,
    setMensajes,
    limpiarMensajes,
    cargar,
    guardarRegistro,
    eliminarUltimoRegistro,
    guardarLoteRegistros,
    actualizarRegistro,
  }
}

export default useNotificaciones