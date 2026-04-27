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
  actualizarOperacionPendiente,
} from '../lib/offlineQueue'

function useNotificaciones({ fechaCertificacion, enfocarId }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(false)
  const [guardandoLote, setGuardandoLote] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [estadisticas, setEstadisticas] = useState({ puntos: 0 })
  const [pendientesSync, setPendientesSync] = useState(0)
  const [sincronizandoPendientes, setSincronizandoPendientes] = useState(false)
  const [pendientesDetalle, setPendientesDetalle] = useState([])
  const [pendientesPorTipo, setPendientesPorTipo] = useState({
    guardarRegistro: 0,
    guardarLote: 0,
  })

  const agregarMensajeVisual = (texto, tipo = 'success') => {
    setMensajes((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        texto,
        tipo,
      },
    ])
  }

  const esErrorDeRed = (error) => {
    const mensaje = String(error?.message || error || '')
    return (
      !navigator.onLine ||
      /fetch|network|failed to fetch|networkerror|load failed/i.test(mensaje)
    )
  }

  const refrescarPendientesSync = async () => {
    const pendientes = await obtenerOperacionesPendientes().catch(() => [])
    setPendientesSync(pendientes.length)
    setPendientesDetalle(
      pendientes.map((pendiente) => ({
        id: pendiente.id,
        tipo: pendiente.tipo,
        descripcion:
          pendiente.tipo === 'guardarRegistro'
            ? `Registro ${pendiente.payload?.id_notificacion || ''}`.trim()
            : `Lote ${Array.isArray(pendiente.payload?.filas) ? pendiente.payload.filas.length : 0} reg(s)`,
        fecha: pendiente.payload?.fecha_certificacion || '',
        codigo:
          pendiente.payload?.codigo ||
          pendiente.payload?.filas?.[0]?.codigo ||
          pendiente.payload?.codigo_lote ||
          '',
        attempts: Number(pendiente.attempts || 0),
        lastError: pendiente.lastError || '',
      }))
    )
    setPendientesPorTipo({
      guardarRegistro: pendientes.filter((pendiente) => pendiente.tipo === 'guardarRegistro').length,
      guardarLote: pendientes.filter((pendiente) => pendiente.tipo === 'guardarLote').length,
    })
    return pendientes
  }

  const ejecutarConReintentos = async (accion, maxIntentos = 3) => {
    let ultimoError = null

    for (let intento = 1; intento <= maxIntentos; intento += 1) {
      try {
        return await accion()
      } catch (error) {
        ultimoError = error
        if (!esErrorDeRed(error) && !/duplicate|unique/i.test(String(error?.message || ''))) {
          throw error
        }

        if (intento < maxIntentos) {
          await new Promise((resolve) => setTimeout(resolve, intento * 250))
        }
      }
    }

    throw ultimoError
  }

  const sincronizarPendientes = async () => {
    if (!navigator.onLine) return

    setSincronizandoPendientes(true)

    const pendientes = await refrescarPendientesSync()
    if (!pendientes.length) {
      setSincronizandoPendientes(false)
      return
    }

    let sincronizados = 0
    let errores = 0

    for (const pendiente of pendientes) {
      if (pendiente.tipo !== 'guardarRegistro' && pendiente.tipo !== 'guardarLote') continue

      try {
        if (pendiente.tipo === 'guardarRegistro') {
          await ejecutarConReintentos(() => insertarRegistro(pendiente.payload))
        } else {
          await ejecutarConReintentos(() => insertarLote(pendiente.payload.filas || []))
        }

        await eliminarOperacionPendiente(pendiente.id)
        sincronizados += 1
      } catch (error) {
        const mensajeError = String(error?.message || '')
        const esConflicto = /duplicate|unique/i.test(mensajeError)

        if (esConflicto) {
          await eliminarOperacionPendiente(pendiente.id)
          sincronizados += 1
        } else {
          errores += 1
          await actualizarOperacionPendiente(pendiente.id, {
            attempts: Number(pendiente.attempts || 0) + 1,
            lastTriedAt: Date.now(),
            lastError: mensajeError || 'Error de sincronizacion',
          }).catch(() => {})
        }
      }
    }

    await refrescarPendientesSync()

    if (sincronizados > 0) {
      setMensaje(`Sincronizados ${sincronizados} registro(s) pendientes`)
      agregarMensajeVisual(
        sincronizados === 1
          ? '1 notificación pendiente fue sincronizada'
          : `${sincronizados} notificaciones pendientes fueron sincronizadas`,
        'sincronizado'
      )
    }

    if (errores > 0) {
      agregarMensajeVisual(
        errores === 1
          ? '1 operación pendiente aún no pudo sincronizarse'
          : `${errores} operaciones pendientes aún no pudieron sincronizarse`,
        'error'
      )
    }

    await cargar()

    setSincronizandoPendientes(false)
    await refrescarPendientesSync().catch(() => {})
  }

  useEffect(() => {
    refrescarPendientesSync().catch(() => {})
    sincronizarPendientes().catch(() => {
      setSincronizandoPendientes(false)
    })

    const manejarOnline = () => {
      sincronizarPendientes().catch(() => {
        setSincronizandoPendientes(false)
      })
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
        agregarMensajeVisual('Guardado sin internet. Quedo pendiente de sincronizacion.', 'pendiente')
        await refrescarPendientesSync().catch(() => {})
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
        agregarMensajeVisual('Guardado sin internet. Quedo pendiente de sincronizacion.', 'pendiente')
        await refrescarPendientesSync().catch(() => {})
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

    const filas = idsNormalizados.map((id) => ({
      id_notificacion: id,
      fecha_certificacion: fechaCertificacion,
      hora: horaLote,
      codigo: codigoNormalizado,
      observacion: observacionNormalizada,
      es_no_urbana: Boolean(esNoUrbanaLote),
      codigo_lote: codigoNormalizado,
    }))

    if (!navigator.onLine) {
      try {
        await agregarOperacionPendiente({
          tipo: 'guardarLote',
          payload: {
            filas,
          },
        })
      } catch (queueError) {
        const msg = `No se pudo guardar el lote sin conexion: ${queueError.message}`
        setErrorMsg(msg)
        await onBeforeError?.()
        return { ok: false, error: msg }
      }

      setMensaje(`Lote pendiente de sincronizacion: ${idsTemporales.length} registro(s)`)
      agregarMensajeVisual(
        idsTemporales.length === 1
          ? '1 notificación del lote quedó pendiente sin internet.'
          : `${idsTemporales.length} notificaciones del lote quedaron pendientes sin internet.`,
        'pendiente'
      )
      await refrescarPendientesSync().catch(() => {})
      await onSuccess?.()
      return { ok: true, offline: true }
    }

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

    try {
      await insertarLote(filas)
    } catch (error) {
      setGuardandoLote(false)

      if (esErrorDeRed(error)) {
        try {
          await agregarOperacionPendiente({
            tipo: 'guardarLote',
            payload: {
              filas,
            },
          })
        } catch (queueError) {
          const msg = `No se pudo guardar el lote sin conexion: ${queueError.message}`
          setErrorMsg(msg)
          await onBeforeError?.()
          return { ok: false, error: msg }
        }

        setMensaje(`Lote pendiente de sincronizacion: ${idsTemporales.length} registro(s)`)
        agregarMensajeVisual(
          idsTemporales.length === 1
            ? '1 notificación del lote quedó pendiente sin internet.'
            : `${idsTemporales.length} notificaciones del lote quedaron pendientes sin internet.`,
          'pendiente'
        )
        await refrescarPendientesSync().catch(() => {})
        await onSuccess?.()
        return { ok: true, offline: true }
      }

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
    pendientesSync,
    sincronizandoPendientes,
    pendientesDetalle,
    pendientesPorTipo,
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