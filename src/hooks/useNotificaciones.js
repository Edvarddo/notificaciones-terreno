import { useEffect, useRef, useState } from 'react'
import {
  obtenerRegistros,
  obtenerOCrearCargaActiva,
  insertarRegistro,
  insertarLote,
  eliminarRegistroPorId,
  existeIdNotificacionEnFecha,
  actualizarRegistroPorId,
  obtenerEstadisticas,
  obtenerTodasLasCargasDeUnDia,
  obtenerCargaActiva,
  obtenerCargaPorId,
} from '../services/notificaciones'
import {
  CODIGOS_BUSQUEDA,
  CODIGOS_EXITOSOS,
  CODIGOS_NEGATIVOS,
} from '../constants/codigos'
import {
  agregarOperacionPendiente,
  obtenerOperacionesPendientes,
  eliminarOperacionPendiente,
  actualizarOperacionPendiente,
} from '../lib/offlineQueue'
import {
  clasificarPorFallbackManual,
  determinarSiEsNoUrbanaDesdeGPS,
} from '../utils/geolocalizacion'
import { validarIdNotificacion, esIdNotificacionValida } from '../utils/validation'
import { enviarReporteFinalizacionCarga } from '../services/cierre'
import { useToast } from '../context/ToastContext'
const TIEMPO_MAXIMO_CLASIFICACION_GEO_MS = 30000
const TIEMPO_MAXIMO_CARGA_ACTIVA_MS = 10000

function useNotificaciones({
  fechaCertificacion,
  enfocarId,
  sessionUserId,
}) {
  const timersMensajesRef = useRef(new Map())
  const mensajeTimerRef = useRef(null)
  const errorMsgTimerRef = useRef(null)

  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(false)
  const [guardandoLote, setGuardandoLote] = useState(false)
  const [mensaje, setMensajeState] = useState('')
  const [errorMsg, setErrorMsgState] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [estadisticas, setEstadisticas] = useState({ puntos: 0, rurales: 0, urbanas: 0 })
  const [cargaActivaId, setCargaActivaId] = useState('')
  const [numeroCarga, setNumeroCarga] = useState(0)
  const [cargaFinalizada, setCargaFinalizada] = useState(false)
  const [pendientesSync, setPendientesSync] = useState(0)
  const [sincronizandoPendientes, setSincronizandoPendientes] = useState(false)
  const [pendientesDetalle, setPendientesDetalle] = useState([])
  const [pendientesPorTipo, setPendientesPorTipo] = useState({
    guardarRegistro: 0,
    guardarLote: 0,
  })
  const { showToast } = useToast()
  const sincronizandoPendientesRef = useRef(false)

  const validarCargaActivaAntesDeGuardar = async (cargaId) => {
    if (!cargaId) {
      return { ok: false, error: 'No hay carga activa para guardar' }
    }

    const carga = await obtenerCargaPorId(cargaId)

    if (!carga) {
      return { ok: false, error: 'La carga activa ya no existe o no está disponible' }
    }

    if (String(carga.estado).toLowerCase() !== 'activa') {
      return {
        ok: false,
        error: 'Esta carga ya fue cerrada en otro dispositivo. Recarga la aplicación para continuar.',
      }
    }

    return { ok: true }
  }
  const setMensaje = (texto, duracion = 2800) => {
    if (mensajeTimerRef.current) {
      clearTimeout(mensajeTimerRef.current)
      mensajeTimerRef.current = null
    }

    setMensajeState(texto)

    if (texto) {
      mensajeTimerRef.current = setTimeout(() => {
        setMensajeState('')
        mensajeTimerRef.current = null
      }, duracion)
    }
  }

  const setErrorMsg = (texto, duracion = 3800) => {
    if (errorMsgTimerRef.current) {
      clearTimeout(errorMsgTimerRef.current)
      errorMsgTimerRef.current = null
    }

    setErrorMsgState(texto)

    if (texto) {
      errorMsgTimerRef.current = setTimeout(() => {
        setErrorMsgState('')
        errorMsgTimerRef.current = null
      }, duracion)
    }
  }

  const agregarMensajeVisual = (texto, tipo = 'success', duracion = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    setMensajes((prev) => [...prev, { id, texto, tipo }])

    const timer = setTimeout(() => {
      timersMensajesRef.current.delete(id)
      setMensajes((prev) => prev.filter((mensaje) => mensaje.id !== id))
    }, duracion)

    timersMensajesRef.current.set(id, timer)
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
    if (!navigator.onLine || sincronizandoPendientesRef.current) return

    const pendientesIniciales = await obtenerOperacionesPendientes().catch(() => [])

    if (!pendientesIniciales.length) return

    sincronizandoPendientesRef.current = true
    setSincronizandoPendientes(true)

    try {
      const pendientes = await refrescarPendientesSync()

      if (!pendientes.length) return

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
            }).catch(() => { })
          }
        }
      }

      await refrescarPendientesSync().catch(() => { })

      if (sincronizados > 0) {
        setMensaje(`Sincronizados ${sincronizados} registro(s) pendientes`)
        showToast(
          `${sincronizados} registros sincronizados`,
          'success'
        )
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

      await refrescarPendientesSync().catch(() => { })
    } finally {
      sincronizandoPendientesRef.current = false
      setSincronizandoPendientes(false)
    }
  }

  useEffect(() => {
    refrescarPendientesSync().catch(() => { })

    const intentarSincronizar = () => {
      sincronizarPendientes().catch(() => { })
    }

    const manejarOnline = () => {
      setTimeout(intentarSincronizar, 1500)
    }

    const manejarFocus = () => {
      intentarSincronizar()
    }

    const manejarVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        intentarSincronizar()
      }
    }

    const intervalo = setInterval(async () => {
      const pendientes = await obtenerOperacionesPendientes().catch(() => [])

      if (pendientes.length > 0 && navigator.onLine) {
        intentarSincronizar()
      }
    }, 30000)

    window.addEventListener('online', manejarOnline)
    window.addEventListener('focus', manejarFocus)
    document.addEventListener('visibilitychange', manejarVisibilityChange)

    return () => {
      window.removeEventListener('online', manejarOnline)
      window.removeEventListener('focus', manejarFocus)
      document.removeEventListener('visibilitychange', manejarVisibilityChange)
      clearInterval(intervalo)
    }
  }, [])

  const generarCodigoLote = () => {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  const resolverClasificacionTerreno = async (esNoUrbanaManual) => {
    if (esNoUrbanaManual === true) {
      return await clasificarPorFallbackManual(true)
    }

    const clasificacionGps = determinarSiEsNoUrbanaDesdeGPS(esNoUrbanaManual)

    const tiempoMaximo = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error('Tiempo de geolocalización agotado')),
        TIEMPO_MAXIMO_CLASIFICACION_GEO_MS
      )
    })

    try {
      return await Promise.race([clasificacionGps, tiempoMaximo])
    } catch (error) {
      return  await clasificarPorFallbackManual(esNoUrbanaManual)
    }
  }

  const limpiarMensajes = () => {
    timersMensajesRef.current.forEach((timer) => clearTimeout(timer))
    timersMensajesRef.current.clear()

    if (mensajeTimerRef.current) {
      clearTimeout(mensajeTimerRef.current)
      mensajeTimerRef.current = null
    }

    if (errorMsgTimerRef.current) {
      clearTimeout(errorMsgTimerRef.current)
      errorMsgTimerRef.current = null
    }

    setMensajeState('')
    setErrorMsgState('')
    setMensajes([])
  }

  const calcularNumeroCargaPorFecha = async (cargaIdBuscada) => {
    if (!cargaIdBuscada) return 0

    const cargas = await obtenerTodasLasCargasDeUnDia(fechaCertificacion)

    const cargasOrdenadas = (cargas || []).slice().sort((a, b) => {
      const fechaA = a?.creada_en ? new Date(a.creada_en).getTime() : 0
      const fechaB = b?.creada_en ? new Date(b.creada_en).getTime() : 0

      if (fechaA !== fechaB) return fechaA - fechaB

      return String(a?.id || '').localeCompare(String(b?.id || ''))
    })

    const indice = cargasOrdenadas.findIndex(
      (carga) => String(carga.id) === String(cargaIdBuscada)
    )

    return indice >= 0 ? indice + 1 : cargasOrdenadas.length || 1
  }

  const asegurarCargaActiva = async () => {
    if (cargaActivaId) {
      return cargaActivaId
    }

    try {
      const carga = await Promise.race([
        obtenerOCrearCargaActiva(fechaCertificacion, sessionUserId),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('Tiempo de espera para la carga activa agotado')),
            TIEMPO_MAXIMO_CARGA_ACTIVA_MS
          )
        }),
      ])

      const cargaId = carga?.id ? String(carga.id) : ''

      if (cargaId) {
        setCargaActivaId(cargaId)

        const numero = await calcularNumeroCargaPorFecha(cargaId)
        setNumeroCarga(numero)
      }

      return cargaId
    } catch (error) {
      console.warn('[carga-activa] no se pudo resolver o crear la carga activa; se continuará sin carga_id', error)
      return ''
    }
  }

  const cargar = async (cargaId = cargaActivaId) => {
    const cargaIdFinal = cargaId || cargaActivaId

    if (!cargaIdFinal) {
      setRegistros([])
      setEstadisticas({ cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 })
      return {
        data: [],
        stats: { cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 },
      }
    }

    try {
      const data = await obtenerRegistros(fechaCertificacion, cargaIdFinal)
      setRegistros(data)

      const stats = await obtenerEstadisticas(fechaCertificacion, cargaIdFinal)
      
      setEstadisticas(stats)

      return { data, stats }
    } catch (error) {
      setErrorMsg(`No se pudieron cargar los registros: ${error.message}`)
      setRegistros([])
      setEstadisticas({ cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 })

      return {
        data: [],
        stats: { cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 },
      }
    }
  }

  useEffect(() => {
    if (!sessionUserId) return

    let cancelled = false

    const prepararCargaActiva = async () => {
      try {
        const carga = await obtenerCargaActiva(fechaCertificacion, sessionUserId)

        if (cancelled) return

        const cargaId = carga?.id ? String(carga.id) : ''

        setCargaActivaId(cargaId)
        setCargaFinalizada(false)

        if (cargaId) {
          const numero = await calcularNumeroCargaPorFecha(cargaId)

          if (!cancelled) {
            setNumeroCarga(numero)
            await cargar(cargaId)
          }
        } else {
          setNumeroCarga(0)
          setRegistros([])
          setEstadisticas({ cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 })
        }
      } catch (error) {
        if (cancelled) return

        setCargaActivaId('')
        setNumeroCarga(0)
        setRegistros([])
        setEstadisticas({ cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 })

        console.warn('[carga-activa] no se pudo consultar la carga activa al montar', error)
      }
    }

    prepararCargaActiva()

    return () => {
      cancelled = true
    }
  }, [fechaCertificacion, sessionUserId])

  useEffect(() => {
    return () => {
      timersMensajesRef.current.forEach((timer) => clearTimeout(timer))
      timersMensajesRef.current.clear()
      if (mensajeTimerRef.current) clearTimeout(mensajeTimerRef.current)
      if (errorMsgTimerRef.current) clearTimeout(errorMsgTimerRef.current)
    }
  }, [])

  const bloquearSiCargaFinalizada = () => {
    if (!cargaFinalizada) return null

    const msg = 'La carga se está cerrando. Espera un momento.'
    setErrorMsg(msg)

    return { ok: false, error: msg }
  }

  const guardarRegistro = async ({
    idNotificacion,
    codigo,
    observacion,
    comentarios,
    esNoUrbana,
    rit,
    año,
  }) => {
    limpiarMensajes()
    setCargando(true)
    setMensaje('Procesando registro...')

    const bloqueo = bloquearSiCargaFinalizada()
    if (bloqueo) {
      setCargando(false)
      return bloqueo
    }

    const validacionId = validarIdNotificacion(idNotificacion)
    const idLimpio = validacionId.valor
    const codigoLimpio = codigo.trim().toUpperCase()
    const observacionLimpia = observacion.trim() || '.'
    const comentariosLimpios = comentarios.trim() || ''
    const ritLimpio = rit?.trim() || ''
    const conTribunal = ritLimpio && año

    if (!idLimpio && !conTribunal) {
      const msg = 'Ingresa ID de notificación o activa Tribunal (RIT + Año)'
      setErrorMsg(msg)
      enfocarId?.()
      setCargando(false)
      return { ok: false, error: msg }
    }

    if (idLimpio && !validacionId.ok) {
      const msg = validacionId.error || 'La ID de notificacion debe contener 8 o 9 digitos'
      setErrorMsg(msg)
      enfocarId?.()
      setCargando(false)
      return { ok: false, error: msg }
    }

    if (!codigoLimpio) {
      const msg = 'Ingresa o selecciona el codigo'
      setErrorMsg(msg)
      setCargando(false)
      return { ok: false, error: msg }
    }

    const codigoLote = generarCodigoLote()

    if (!navigator.onLine) {
      let clasificacionTerreno = null

      try {
        clasificacionTerreno = await resolverClasificacionTerreno(esNoUrbana)
      } catch {
        clasificacionTerreno = await clasificarPorFallbackManual(esNoUrbana)
      }

      try {
        await agregarOperacionPendiente({
          tipo: 'guardarRegistro',
          payload: {
            id_notificacion: idLimpio || null,
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
            comentarios: comentariosLimpios,
            es_no_urbana: Boolean(clasificacionTerreno.es_no_urbana),
            geolocalizacion_fuente: clasificacionTerreno.fuente || 'manual',
            latitud: clasificacionTerreno.latitud,
            longitud: clasificacionTerreno.longitud,
            codigo_lote: codigoLote,
            carga_id: cargaActivaId || null,
            rit: ritLimpio || null,
            año: año || null,
          },
        })

        setMensaje('Sin conexion: registro pendiente de sincronizacion')
        showToast(
          'Registro pendiente de sincronización',
          'warning'
        )
        agregarMensajeVisual(
          'Guardado sin internet. Quedo pendiente de sincronizacion.',
          'pendiente'
        )

        await refrescarPendientesSync().catch(() => { })
        enfocarId?.()
        setCargando(false)

        return { ok: true, offline: true }
      } catch (queueError) {
        const msg = `No se pudo guardar sin conexion: ${queueError.message}`
        setErrorMsg(msg)
        setCargando(false)
        return { ok: false, error: msg }
      }
    }

    const cargaId = await asegurarCargaActiva()
    const validacionCarga = await validarCargaActivaAntesDeGuardar(cargaId)

    if (!validacionCarga.ok) {
      setErrorMsg(validacionCarga.error)
      setCargaActivaId('')
      setNumeroCarga(0)
      setRegistros([])
      setEstadisticas({ cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 })
      setCargando(false)
      return { ok: false, error: validacionCarga.error }
    }

    const clasificacionTerreno = await resolverClasificacionTerreno(esNoUrbana)

    try {
      if (idLimpio) {
        const yaExiste = await existeIdNotificacionEnFecha(idLimpio, fechaCertificacion)

        if (yaExiste) {
          const msg = 'Ya existe un registro con esa ID de notificacion'
          setErrorMsg(msg)
          showToast(msg, 'error')
          enfocarId?.()
          setCargando(false)
          return { ok: false, error: msg }
        }
      }
    } catch (error) {
      if (esErrorDeRed(error)) {
        try {
          await agregarOperacionPendiente({
            tipo: 'guardarRegistro',
            payload: {
              id_notificacion: idLimpio || null,
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
              comentarios: comentariosLimpios,
              es_no_urbana: Boolean(clasificacionTerreno.es_no_urbana),
              geolocalizacion_fuente: clasificacionTerreno.fuente || 'manual',
              latitud: clasificacionTerreno.latitud,
              longitud: clasificacionTerreno.longitud,
              codigo_lote: codigoLote,
              carga_id: cargaId,
              rit: ritLimpio || null,
              año: año || null,
            },
          })
        } catch (queueError) {
          const msg = `No se pudo guardar sin conexion: ${queueError.message}`
          setErrorMsg(msg)
          setCargando(false)
          return { ok: false, error: msg }
        }

        setMensaje('Sin conexion: registro pendiente de sincronizacion')
        agregarMensajeVisual('Guardado sin internet. Quedo pendiente de sincronizacion.', 'pendiente')
        await refrescarPendientesSync().catch(() => { })
        enfocarId?.()
        setCargando(false)
        return { ok: true, offline: true }
      }

      const msg = `No se pudo validar la ID: ${error.message}`
      setErrorMsg(msg)
      setCargando(false)
      return { ok: false, error: msg }
    }

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
        id_notificacion: idLimpio || null,
        fecha_certificacion: fechaCertificacion,
        hora,
        codigo: codigoLimpio,
        observacion: observacionLimpia,
        comentarios: comentariosLimpios,
        es_no_urbana: Boolean(clasificacionTerreno.es_no_urbana),
        geolocalizacion_fuente: clasificacionTerreno.fuente || 'manual',
        latitud: clasificacionTerreno.latitud,
        longitud: clasificacionTerreno.longitud,
        codigo_lote: codigoLote,
        carga_id: cargaId,
        rit: ritLimpio || null,
        año: año || null,
      })
      showToast('Notificación guardada', 'success')
      setMensaje('Guardado')

      try {
        await cargar(cargaId)
      } catch (refreshError) {
        console.warn('[guardarRegistro] no se pudo refrescar luego de guardar', refreshError)
      }

      enfocarId?.()
      return { ok: true }
    } catch (error) {
      if (esErrorDeRed(error)) {
        try {
          await agregarOperacionPendiente({
            tipo: 'guardarRegistro',
            payload: {
              id_notificacion: idLimpio || null,
              fecha_certificacion: fechaCertificacion,
              hora,
              codigo: codigoLimpio,
              observacion: observacionLimpia,
              comentarios: comentariosLimpios,
              es_no_urbana: Boolean(clasificacionTerreno.es_no_urbana),
              geolocalizacion_fuente: clasificacionTerreno.fuente || 'manual',
              latitud: clasificacionTerreno.latitud,
              longitud: clasificacionTerreno.longitud,
              codigo_lote: codigoLote,
              carga_id: cargaId,
              rit: ritLimpio || null,
              año: año || null,
            },
          })
        } catch (queueError) {
          const msg = `No se pudo guardar sin conexion: ${queueError.message}`
          setErrorMsg(msg)
          showToast(msg, 'error')
          return { ok: false, error: msg }
        }

        setMensaje('Sin conexion: registro pendiente de sincronizacion')
        agregarMensajeVisual('Guardado sin internet. Quedo pendiente de sincronizacion.', 'pendiente')
        await refrescarPendientesSync().catch(() => { })
        enfocarId?.()
        return { ok: true, offline: true }
      }

      const msg = error.message?.toLowerCase().includes('duplicate')
        ? 'Ya existe un registro con esa ID de notificacion'
        : `Error al guardar: ${error.message}`

      setErrorMsg(msg)
      showToast(msg, 'error')
      return { ok: false, error: msg }
    } finally {
      setCargando(false)
    }
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
      showToast(msg, 'error')
      return { ok: false, error: msg }
    }
    console.log('Registro eliminado:', ultimo)
    setMensaje('Eliminado')
    showToast(`Último registro ${ultimo.id_notificacion} eliminado`, 'warning')
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
    mostraTribunalLote,
    tribunalesLote,
    codigoPorId = {},
    onSuccess,
    onBeforeError,
  }) => {
    limpiarMensajes()

    const bloqueo = bloquearSiCargaFinalizada()
    if (bloqueo) return bloqueo

    const modoTribunal = Boolean(mostraTribunalLote)

    if (idsTemporales.length === 0 && !modoTribunal) {
      const msg = 'No hay IDs en el lote'

      setErrorMsg(msg)
      showToast(msg, 'error')
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    const idsNormalizados = idsTemporales.map((id) => String(id).trim())

    if (!modoTribunal) {
      const idsInvalidos = idsNormalizados.filter((id) => !esIdNotificacionValida(id))

      if (idsInvalidos.length > 0) {
        const msg = `Hay IDs invalidas en el lote: ${idsInvalidos.join(', ')}. Deben tener 8 o 9 digitos.`
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
    }

    const horaFinal =
      horaLote?.trim()?.length === 4
        ? horaLote.trim()
        : new Date()
          .toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
          .replace(':', '')

    const codigoNormalizado = codigoLote.trim().toUpperCase()

    if (!codigoNormalizado) {
      const msg = 'Ingresa o selecciona el codigo del lote'
      setErrorMsg(msg)
      await onBeforeError?.()
      return { ok: false, error: msg }
    }

    const tribunalesNormalizados = (Array.isArray(tribunalesLote) ? tribunalesLote : []).map((item) => ({
      rit: String(item?.rit ?? '').trim(),
      año: String(item?.año ?? '').trim(),
    }))

    if (modoTribunal) {
      if (tribunalesNormalizados.length === 0) {
        const msg = 'Agrega al menos un bloque de tribunal'
        setErrorMsg(msg)
        await onBeforeError?.()
        return { ok: false, error: msg }
      }

      const bloquesInvalidos = tribunalesNormalizados.filter((item) => !item.rit || !item.año)

      if (bloquesInvalidos.length > 0) {
        const msg = 'Completa RIT y Año en cada bloque de tribunal'
        setErrorMsg(msg)
        await onBeforeError?.()
        return { ok: false, error: msg }
      }
    }

    const observacionNormalizada = observacionLote.trim() || '.'

    let clasificacionTerreno = null

    try {
      clasificacionTerreno = await resolverClasificacionTerreno(esNoUrbanaLote)
    } catch {
      clasificacionTerreno = await clasificarPorFallbackManual(esNoUrbanaLote)
    }

    const idLoteUnico = crypto.randomUUID()
    const cargaIdParaFilas = navigator.onLine ? '' : (cargaActivaId || null)
    const filas = []

    if (idsNormalizados.length > 0) {
      filas.push(
        ...idsNormalizados.map((id) => ({
          id_notificacion: id,
          fecha_certificacion: fechaCertificacion,
          hora: horaFinal,
          codigo: (codigoPorId && codigoPorId[String(id)])
            ? String(codigoPorId[String(id)]).trim().toUpperCase()
            : codigoNormalizado,
          observacion: observacionNormalizada,
          es_no_urbana: Boolean(clasificacionTerreno.es_no_urbana),
          geolocalizacion_fuente: clasificacionTerreno.fuente || 'manual',
          latitud: clasificacionTerreno.latitud,
          longitud: clasificacionTerreno.longitud,
          codigo_lote: idLoteUnico,
          carga_id: cargaIdParaFilas,
          rit: null,
          año: null,
        }))
      )
    }

    if (modoTribunal && tribunalesNormalizados.length > 0) {
      filas.push(
        ...tribunalesNormalizados.map((item) => ({
          id_notificacion: null,
          fecha_certificacion: fechaCertificacion,
          hora: horaFinal,
          codigo: codigoNormalizado,
          observacion: observacionNormalizada,
          es_no_urbana: Boolean(clasificacionTerreno.es_no_urbana),
          geolocalizacion_fuente: clasificacionTerreno.fuente || 'manual',
          latitud: clasificacionTerreno.latitud,
          longitud: clasificacionTerreno.longitud,
          codigo_lote: idLoteUnico,
          carga_id: cargaIdParaFilas,
          rit: item.rit,
          año: Number(item.año),
        }))
      )
    }

    const cantidadFilas = filas.length

    if (!navigator.onLine) {
      try {
        await agregarOperacionPendiente({
          tipo: 'guardarLote',
          payload: { filas },
        })
      } catch (queueError) {
        const msg = `No se pudo guardar el lote sin conexion: ${queueError.message}`
        setErrorMsg(msg)
        await onBeforeError?.()
        return { ok: false, error: msg }
      }

      setMensaje(`Lote pendiente de sincronizacion: ${cantidadFilas} registro(s)`)
      showToast(
        `${cantidadFilas} registros pendientes`,
        'warning'
      )
      agregarMensajeVisual(
        cantidadFilas === 1
          ? '1 notificación del lote quedó pendiente sin internet.'
          : `${cantidadFilas} notificaciones del lote quedaron pendientes sin internet.`,
        'pendiente'
      )
      await refrescarPendientesSync().catch(() => { })
      await onSuccess?.()
      return { ok: true, offline: true }
    }

    const cargaId = await asegurarCargaActiva()
    const validacionCarga = await validarCargaActivaAntesDeGuardar(cargaId)

    if (!validacionCarga.ok) {
      setErrorMsg(validacionCarga.error)
      setCargaActivaId('')
      setNumeroCarga(0)
      setRegistros([])
      setEstadisticas({ cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 })
      await onBeforeError?.()
      return { ok: false, error: validacionCarga.error }
    }

    const filasOnline = filas.map((fila) => ({
      ...fila,
      carga_id: cargaId,
    }))

    if (!modoTribunal) {
      for (const id of idsNormalizados) {
        try {
          const yaExiste = await existeIdNotificacionEnFecha(id, fechaCertificacion)

          if (yaExiste) {
            const msg = `No se puede guardar el lote porque la ID ${id} ya existe en la base de datos`
            setErrorMsg(msg)
            showToast(
              `La ID ${id} ya existe en la base de datos`,
              'error'
            )
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
    }

    setGuardandoLote(true)

    try {
      await insertarLote(filasOnline)
      showToast(`${cantidadFilas} registros guardados`, 'success')
      setMensaje(`Lote guardado: ${cantidadFilas} registro(s)`)
      await onSuccess?.()

      try {
        await cargar(cargaId)
      } catch (refreshError) {
        console.warn('[guardarLoteRegistros] no se pudo refrescar luego de guardar', refreshError)
      }

      return { ok: true }
    } catch (error) {
      if (esErrorDeRed(error)) {
        try {
          await agregarOperacionPendiente({
            tipo: 'guardarLote',
            payload: { filas: filasOnline },
          })
        } catch (queueError) {
          const msg = `No se pudo guardar el lote sin conexion: ${queueError.message}`
          setErrorMsg(msg)
          await onBeforeError?.()
          return { ok: false, error: msg }
        }

        setMensaje(`Lote pendiente de sincronizacion: ${cantidadFilas} registro(s)`)
        agregarMensajeVisual(
          cantidadFilas === 1
            ? '1 notificación del lote quedó pendiente sin internet.'
            : `${cantidadFilas} notificaciones del lote quedaron pendientes sin internet.`,
          'pendiente'
        )
        await refrescarPendientesSync().catch(() => { })
        await onSuccess?.()
        return { ok: true, offline: true }
      }

      const msg = error.message?.toLowerCase().includes('duplicate')
        ? 'No se puede guardar el lote porque una o más IDs ya existen'
        : `Error al guardar lote: ${error.message}`

      setErrorMsg(msg)
      showToast(msg, 'error')
      await onBeforeError?.()
      return { ok: false, error: msg }
    } finally {
      setGuardandoLote(false)
    }
  }

  const actualizarRegistro = async ({
    id,
    codigo,
    hora,
    es_no_urbana,
    observacion,
    comentarios,
    codigo_lote,
  }) => {
    limpiarMensajes()

    const codigoLimpio = String(codigo ?? '').trim().toUpperCase()
    const horaLimpia = String(hora ?? '').trim()
    const observacionLimpia = String(observacion ?? '').trim() || '.'
    const comentariosLimpios = String(comentarios ?? '').trim()
    const codigoLoteLimpio = String(codigo_lote ?? '').trim()

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
        observacion: observacionLimpia,
        comentarios: comentariosLimpios,
        codigo_lote: codigoLoteLimpio || null,
      })
    } catch (error) {
      const msg = `No se pudo actualizar: ${error.message}`
      setErrorMsg(msg)
      showToast(msg, 'error')
      return { ok: false, error: msg }
    }

    showToast('Registro actualizado', 'success')
    setMensaje('Registro actualizado')
    await cargar()
    return { ok: true }
  }

  const construirResumenCarga = (registrosDia, statsDia) => {
    const resumenPorCodigo = (registrosDia || []).reduce(
      (acc, registro) => {
        const codigo = String(registro?.codigo ?? '').trim().toUpperCase()
        acc.total += 1

        if (CODIGOS_EXITOSOS.has(codigo)) acc.exitosas += 1
        else if (CODIGOS_BUSQUEDA.has(codigo)) acc.busqueda += 1
        else if (CODIGOS_NEGATIVOS.has(codigo)) acc.negativas += 1
        else acc.otros += 1

        return acc
      },
      { total: 0, exitosas: 0, busqueda: 0, negativas: 0, otros: 0 }
    )

    return {
      fecha_certificacion: fechaCertificacion,
      carga_total: statsDia?.cargaTotal ?? registrosDia.length,
      puntos: statsDia?.puntos ?? 0,
      urbanas: statsDia?.urbanas ?? 0,
      rurales: statsDia?.rurales ?? 0,
      total_notificaciones: resumenPorCodigo.total,
      exitosas: resumenPorCodigo.exitosas,
      busqueda: resumenPorCodigo.busqueda,
      negativas: resumenPorCodigo.negativas,
      otros: resumenPorCodigo.otros,
    }
  }

  const finalizarCarga = async () => {
    limpiarMensajes()

    const cargaId = await asegurarCargaActiva()
    const validacionCarga = await validarCargaActivaAntesDeGuardar(cargaId)

    if (!validacionCarga.ok) {
      setErrorMsg(validacionCarga.error)
      setCargaActivaId('')
      setNumeroCarga(0)
      setRegistros([])
      setEstadisticas({ cargaTotal: 0, puntos: 0, rurales: 0, urbanas: 0 })
      setCargando(false)
      return { ok: false, error: validacionCarga.error }
    }
    if (cargaFinalizada) {
      const msg = 'La carga se está cerrando. Espera un momento.'
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    if (pendientesSync > 0 || sincronizandoPendientes) {
      const msg = 'Hay operaciones pendientes de sincronización. Conéctate y sincroniza antes de finalizar.'
      setErrorMsg(msg)
      return { ok: false, error: msg }
    }

    let registrosDia = registros
    let statsDia = estadisticas
    let envio = null

    setCargaFinalizada(true)

    try {
      const snapshot = await cargar()
      registrosDia = snapshot?.data ?? registrosDia
      statsDia = snapshot?.stats ?? statsDia
    } catch {
      // cargar() ya deja el error visible si falla
    }

    try {
      envio = await enviarReporteFinalizacionCarga(fechaCertificacion, cargaId)

      if (!envio?.ok) {
        const msg = envio?.error || 'No se pudo enviar el reporte de cierre'
        setErrorMsg(msg)
        setCargaFinalizada(false)
        return { ok: false, error: msg }
      }
    } catch (error) {
      const msg = `No se pudo enviar el reporte de cierre: ${error.message}`
      setErrorMsg(msg)
      setCargaFinalizada(false)
      return { ok: false, error: msg }
    }

    setCargaActivaId('')
    setNumeroCarga(0)
    setRegistros([])
    setEstadisticas({ puntos: 0, rurales: 0, urbanas: 0 })

    setCargaFinalizada(false)
    setMensaje('Carga finalizada. La siguiente se creará cuando guardes el próximo registro.')
    agregarMensajeVisual('Se envió el reporte por correo. Próxima carga lista cuando guardes.', 'sincronizado')
    showToast(
      'Carga finalizada correctamente',
      'success'
    )
    return { ok: true, resumen: construirResumenCarga(registrosDia, statsDia) }
  }

  return {
    registros,
    cargando,
    guardandoLote,
    mensaje,
    mensajes,
    errorMsg,
    estadisticas,
    cargaActivaId,
    numeroCarga,
    pendientesSync,
    sincronizandoPendientes,
    pendientesDetalle,
    pendientesPorTipo,
    cargaFinalizada,
    setMensaje,
    setErrorMsg,
    setMensajes,
    limpiarMensajes,
    cargar,
    guardarRegistro,
    eliminarUltimoRegistro,
    guardarLoteRegistros,
    actualizarRegistro,
    finalizarCarga,
  }
}

export default useNotificaciones