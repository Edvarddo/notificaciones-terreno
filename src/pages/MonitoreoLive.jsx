import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  obtenerRegistros,
  actualizarRegistroPorId,
  obtenerTodasLasCargasDeUnDia,
} from '../services/notificaciones'
import CodigoDialog from '../features/CodigoDialog'

function generarIdPrueba() {
  // generar un id_notificacion aleatorio de 1-8 dígitos
  return String(Math.floor(100000 + Math.random() * 899999))
}

function MonitoreoLive({ fechaCertificacion, cargaId, soloLectura = false, esperandoCargaActiva = false }) {
  const [registros, setRegistros] = useState([])
  const [cargasDelDia, setCargasDelDia] = useState([])
  const [editandoId, setEditandoId] = useState(null)
  const [esRebajadaEdit, setEsRebajadaEdit] = useState(false)
  const [codigoLoteEdit, setCodigoLoteEdit] = useState('')
  const [codigoDialogAbierto, setCodigoDialogAbierto] = useState(false)
  const [registroCodigoEditando, setRegistroCodigoEditando] = useState(null)
  const [cargasListas, setCargasListas] = useState(false)
  const mounted = useRef(true)
  const channelRef = useRef(null)

  const obtenerNumeroCarga = (carga, fallbackIndex = 0) => {
    const numero = Number(carga?.numero_carga)
    if (Number.isFinite(numero) && numero > 0) {
      return numero
    }

    return fallbackIndex + 1
  }

  const mapaCargas = useMemo(() => {
    const mapa = new Map()

    ;(cargasDelDia || []).forEach((carga, index) => {
      const cargaIdTabla = String(carga?.id || '').trim()
      if (!cargaIdTabla) return

      mapa.set(cargaIdTabla, {
        numero: obtenerNumeroCarga(carga, index),
        clase: `carga-${(index % 6) + 1}`,
      })
    })

    if (mapa.size === 0) {
      const idsOrdenados = []
      const idsVistos = new Set()

      registros.forEach((registro) => {
        const cargaIdRegistro = String(registro?.carga_id || '').trim()
        if (!cargaIdRegistro || idsVistos.has(cargaIdRegistro)) {
          return
        }

        idsVistos.add(cargaIdRegistro)
        idsOrdenados.push(cargaIdRegistro)
      })

      idsOrdenados.forEach((cargaId, index) => {
        mapa.set(cargaId, {
          numero: index + 1,
          clase: `carga-${(index % 6) + 1}`,
        })
      })
    }

    return mapa
  }, [cargasDelDia, registros])

  const obtenerInfoCarga = (cargaIdFila) => {
    const id = String(cargaIdFila || '')
    if (!id) {
      return { etiqueta: 'Sin carga', clase: 'carga-sin-dato' }
    }

    const carga = mapaCargas.get(id)
    if (!carga) {
      return { etiqueta: 'Carga', clase: 'carga-desconocida' }
    }

    return {
      etiqueta: `Carga ${carga.numero}`,
      clase: carga.clase,
    }
  }

  const mapaLotes = useMemo(() => {
    const mapa = new Map()
    const registrosConLote = registros
      .map((registro) => String(registro?.codigo_lote || '').trim())
      .filter(Boolean)

    const conteoLotes = registrosConLote.reduce((acc, codigoLote) => {
      acc.set(codigoLote, (acc.get(codigoLote) || 0) + 1)
      return acc
    }, new Map())

    const lotesUnicos = Array.from(new Set(registrosConLote))
    lotesUnicos.forEach((codigoLote, index) => {
      mapa.set(codigoLote, {
        numero: index + 1,
        clase: `lote-${(index % 6) + 1}`,
        total: conteoLotes.get(codigoLote) || 0,
      })
    })

    return mapa
  }, [registros])

  const obtenerInfoLote = (codigoLote) => {
    const id = String(codigoLote || '').trim()
    if (!id) {
      return { etiqueta: 'Sin lote', clase: 'lote-sin-dato' }
    }

    const lote = mapaLotes.get(id)
    if (!lote) {
      return { etiqueta: id, clase: 'lote-desconocido', mostrar: false }
    }

    return {
      etiqueta: `Lote ${lote.numero}`,
      clase: lote.clase,
      mostrar: lote.total > 1,
    }
  }

  const registrosAgrupadosPorCarga = useMemo(() => {
    const grupos = new Map()

    registros.forEach((registro) => {
      const cargaIdRegistro = String(registro?.carga_id || '').trim() || 'sin-carga'
      if (!grupos.has(cargaIdRegistro)) {
        grupos.set(cargaIdRegistro, [])
      }

      grupos.get(cargaIdRegistro).push(registro)
    })

    const entradas = [...grupos.entries()]
    entradas.sort((a, b) => {
      const infoA = a[0] === 'sin-carga' ? { numero: Number.POSITIVE_INFINITY } : mapaCargas.get(a[0]) || { numero: Number.POSITIVE_INFINITY }
      const infoB = b[0] === 'sin-carga' ? { numero: Number.POSITIVE_INFINITY } : mapaCargas.get(b[0]) || { numero: Number.POSITIVE_INFINITY }
      return infoA.numero - infoB.numero
    })

    return entradas.map(([cargaIdGrupo, items]) => ({
      cargaId: cargaIdGrupo,
      cargaInfo: cargaIdGrupo === 'sin-carga' ? null : mapaCargas.get(cargaIdGrupo) || null,
      registros: items.slice().sort((a, b) => {
        const ha = String(a?.hora || '0000')
        const hb = String(b?.hora || '0000')
        return hb.localeCompare(ha)
      }),
    }))
  }, [mapaCargas, registros])

  const gruposPublicos = useMemo(() => {
    return registrosAgrupadosPorCarga
      .slice()
      .sort((a, b) => {
        const numeroA = a.cargaInfo?.numero || Number.POSITIVE_INFINITY
        const numeroB = b.cargaInfo?.numero || Number.POSITIVE_INFINITY
        return numeroA - numeroB
      })
  }, [registrosAgrupadosPorCarga])

  const [grupoSeleccionadoId, setGrupoSeleccionadoId] = useState('')

  useEffect(() => {
    if (!soloLectura) return

    const primerGrupo = gruposPublicos[0]
    if (!primerGrupo) {
      if (grupoSeleccionadoId !== '') setGrupoSeleccionadoId('')
      return
    }

    const grupoExiste = gruposPublicos.some((grupo) => grupo.cargaId === grupoSeleccionadoId)
    if (!grupoExiste) {
      setGrupoSeleccionadoId(primerGrupo.cargaId)
    }
  }, [grupoSeleccionadoId, gruposPublicos, soloLectura])

  const grupoPublicoActivo = useMemo(() => {
    if (!soloLectura) return null
    if (!gruposPublicos.length) return null

    return gruposPublicos.find((grupo) => grupo.cargaId === grupoSeleccionadoId) || gruposPublicos[0]
  }, [gruposPublicos, grupoSeleccionadoId, soloLectura])

  const obtenerInfoGrupo = (grupo) => {
    if (grupo.cargaId === 'sin-carga') {
      return { titulo: 'Sin carga', clase: 'carga-sin-dato' }
    }

    const numero = grupo.cargaInfo?.numero || 0
    const clase = grupo.cargaInfo?.clase || 'carga-desconocida'
    return { titulo: `Carga ${numero}`, clase }
  }

  async function refetch() {
    try {
      const data = await obtenerRegistros(fechaCertificacion, cargaId)
      if (mounted.current) setRegistros(data || [])
      console.log('Refetched registros, count=', data?.length || 0)
    } catch (err) {
      console.error('Error refetch', err)
    }
  }

  useEffect(() => {
    mounted.current = true

    if (soloLectura && esperandoCargaActiva && !cargaId) {
      setRegistros([])
      setPollingActive(false)
      return () => {
        mounted.current = false
      }
    }

    async function cargarInicial() {
      try {
        const data = await obtenerRegistros(fechaCertificacion, cargaId)
        if (mounted.current) setRegistros(data || [])
      } catch (err) {
        console.error('Error cargando registros iniciales', err)
      }
    }

    cargarInicial()

    // Solo polling: refresca cada 10 segundos.
    console.log('Iniciando polling al montar MonitoreoLive (cada 10s)')
    const pollInterval = setInterval(async () => {
      try {
        const data = await obtenerRegistros(fechaCertificacion, cargaId)
        if (!mounted.current) return
        const count = data?.length || 0
        setRegistros(data || [])
        setLastRefetch(new Date())
        setRefetchCount((prev) => prev + 1)
        console.log('Polling refetch encontró', count, 'registros')
      } catch (e) {
        console.warn('Polling error', e)
      }
    }, 10000)

    pollingRef.current = pollInterval
    setPollingActive(true)

    return () => {
      mounted.current = false
      // Detener polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      setPollingActive(false)
      console.log('MonitoreoLive cleanup: polling detenido')
    }
  }, [fechaCertificacion, cargaId, esperandoCargaActiva, soloLectura])

  useEffect(() => {
    let cancelled = false

    const cargarCargas = async () => {
      setCargasListas(false)

      const registrosDelDia = registros.filter((r) => (r.fecha_certificacion || '') === fechaCertificacion)
      const idsUnicos = Array.from(new Set(registrosDelDia.map((r) => r.carga_id).filter(Boolean)))

      try {
        const lista = await obtenerTodasLasCargasDeUnDia(fechaCertificacion)
        if (cancelled) return

        const todasOrdenadas = (lista || []).slice().sort((a, b) => {
          const numeroA = Number(a?.numero_carga)
          const numeroB = Number(b?.numero_carga)

          if (Number.isFinite(numeroA) && Number.isFinite(numeroB) && numeroA !== numeroB) {
            return numeroA - numeroB
          }

          const ta = a?.creada_en ? new Date(a.creada_en).getTime() : 0
          const tb = b?.creada_en ? new Date(b.creada_en).getTime() : 0
          return ta - tb
        })

        const listaFiltrada = todasOrdenadas.filter((c) => idsUnicos.includes(c.id))

        if (listaFiltrada.length) {
          if (!cancelled) {
            setCargasDelDia(listaFiltrada)
            setCargasListas(true)
          }
          return
        }
      } catch (error) {
        // seguimos con fallback
      }

      const primerRegistroPorCarga = {}
      for (const id of idsUnicos) {
        const regs = registrosDelDia.filter((r) => String(r.carga_id || '') === String(id))
        const times = regs.map((r) => {
          const horaTexto = String(r.hora || '0000').padStart(4, '0')
          const hh = horaTexto.slice(0, 2)
          const mm = horaTexto.slice(2, 4)
          const d = new Date(`${fechaCertificacion}T${hh}:${mm}:00`).getTime()
          return Number.isFinite(d) ? d : Infinity
        })
        primerRegistroPorCarga[id] = times.length ? Math.min(...times) : Infinity
      }

      const idsOrdenados = idsUnicos
        .slice()
        .sort((a, b) => (primerRegistroPorCarga[a] || Infinity) - (primerRegistroPorCarga[b] || Infinity))

      const listaFallback = idsOrdenados.map((id) => ({ id }))
      if (!cancelled) {
        setCargasDelDia(listaFallback)
        setCargasListas(true)
      }
    }

    void cargarCargas()

    return () => {
      cancelled = true
    }
  }, [fechaCertificacion, registros])

  const reiniciarSuscripcion = async () => {
    await refetch()
  }

  const abrirEdicion = (registro) => {
    setEditandoId(registro.id)
    setEsRebajadaEdit(registro.es_rebajada || false)
    setCodigoLoteEdit(registro.codigo_lote || '')
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setEsRebajadaEdit(false)
    setCodigoLoteEdit('')
  }

  const guardarEdicion = async (id) => {
    if (soloLectura) return

    try {
      await actualizarRegistroPorId(id, {
        es_rebajada: esRebajadaEdit,
        codigo_lote: codigoLoteEdit,
      })
      // Actualizar estado local
      setRegistros((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                es_rebajada: esRebajadaEdit,
                codigo_lote: codigoLoteEdit,
              }
            : r
        )
      )
      cancelarEdicion()
    } catch (err) {
      console.error('Error actualizando es_rebajada', err)
    }
  }

  const abrirCambioCodigo = (registro) => {
    if (soloLectura) return

    setRegistroCodigoEditando(registro)
    setCodigoDialogAbierto(true)
  }

  const cerrarCambioCodigo = () => {
    setCodigoDialogAbierto(false)
    setRegistroCodigoEditando(null)
  }

  const seleccionarCodigo = async (codigoElegido) => {
    if (soloLectura) return

    const registro = registroCodigoEditando
    if (!registro) return

    const nuevoCodigo = String(codigoElegido ?? '').trim().toUpperCase()
    if (!nuevoCodigo) return

    try {
      await actualizarRegistroPorId(registro.id, {
        codigo: nuevoCodigo,
      })

      setRegistros((prev) =>
        prev.map((r) => (r.id === registro.id ? { ...r, codigo: nuevoCodigo } : r))
      )

      cerrarCambioCodigo()
    } catch (err) {
      console.error('Error cambiando código', err)
    }
  }

  // Polling fallback (dev) to detect changes if realtime fails
  const pollingRef = useRef(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [lastRefetch, setLastRefetch] = useState(null)
  const [refetchCount, setRefetchCount] = useState(0)

  const startPolling = () => {
    if (pollingRef.current) return
    console.log('Polling iniciado (cada 2s)')
    pollingRef.current = setInterval(async () => {
      try {
        const data = await obtenerRegistros(fechaCertificacion, cargaId)
        if (!mounted.current) return
        const count = data?.length || 0
        setRegistros(data || [])
        setLastRefetch(new Date())
        setRefetchCount((prev) => prev + 1)
        console.log('Polling refetch encontró', count, 'registros')
      } catch (e) {
        console.warn('Polling error', e)
      }
    }, 2000)
    setPollingActive(true)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setPollingActive(false)
  }

  return (
    <div className="monitoreo-live pagina-desktop-only">
      <h2>{soloLectura ? 'Monitoreo público' : 'Monitoreo por refetch'}</h2>
      <p className="kicker">
        {soloLectura
          ? esperandoCargaActiva
            ? 'Sin carga activa por ahora. La tabla queda vacía esperando la siguiente carga.'
            : 'Vista pública de solo lectura, con refresco automático cada 10 segundos.'
          : 'Notificaciones subidas desde terreno (solo lectura, refresco cada 10 segundos)'}
      </p>

      <div className="tabla-wrapper">
        {soloLectura ? (
          <div className="monitoreo-publico-panel">
            <div className="monitoreo-publico-selector">
              <label className="monitoreo-publico-selector-label" htmlFor="selector-carga-publica">
                Carga visible
              </label>
              <select
                id="selector-carga-publica"
                className="select-tabla monitoreo-publico-select"
                value={grupoSeleccionadoId}
                onChange={(e) => setGrupoSeleccionadoId(e.target.value)}
                disabled={gruposPublicos.length === 0}
              >
                {gruposPublicos.map((grupo) => {
                  const infoGrupo = obtenerInfoGrupo(grupo)
                  return (
                    <option key={grupo.cargaId} value={grupo.cargaId}>
                      {`${infoGrupo.titulo} - ${grupo.registros.length} registro(s)`}
                    </option>
                  )
                })}
              </select>
              <span className="monitoreo-publico-selector-info">
                {grupoPublicoActivo ? `${grupoPublicoActivo.registros.length} registro(s)` : 'Sin cargas disponibles'}
              </span>
            </div>

            {grupoPublicoActivo ? (
              <section className={`monitoreo-grupo ${obtenerInfoGrupo(grupoPublicoActivo).clase}`}>
                <div className="monitoreo-grupo-header">
                  <h3>{obtenerInfoGrupo(grupoPublicoActivo).titulo}</h3>
                  <span>{grupoPublicoActivo.registros.length} registro(s)</span>
                </div>

                <table className="tabla-monitoreo tabla-monitoreo-grupo">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>ID Notif / RIT</th>
                      <th>Código</th>
                      <th>Hora</th>
                      <th>Observación</th>
                      <th>Código Lote</th>
                      <th>No Urbana</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grupoPublicoActivo.registros.map((r) => {
                      const infoLote = obtenerInfoLote(r.codigo_lote)
                      const claseTipo = r.es_no_urbana ? 'tipo-rural' : 'tipo-urbana'
                      return (
                        <tr key={r.id} className={`${infoLote.clase} ${claseTipo}`.trim()}>
                          <td>{r.id}</td>
                          <td>
                            {r.id_notificacion ? (
                              r.id_notificacion
                            ) : r.rit ? (
                              <span className="tribunal-badge">{r.rit}-{r.año}</span>
                            ) : (
                              <span className="sin-id">--</span>
                            )}
                          </td>
                          <td>{r.codigo}</td>
                          <td>{r.hora}</td>
                          <td>{r.observacion}</td>
                          <td>
                            {infoLote.mostrar ? (
                              <div className="lote-celda">
                                <span className={`lote-badge ${infoLote.clase}`}>{infoLote.etiqueta}</span>
                                <span className="lote-codigo">{r.codigo_lote}</span>
                              </div>
                            ) : (
                              <span className="lote-codigo lote-codigo-vacio" aria-label="Sin lote visible" />
                            )}
                          </td>
                          <td>
                            <span className={`tipo-badge-monitoreo ${claseTipo}`}>
                              {r.es_no_urbana ? 'No urbana' : 'Urbana'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            ) : cargasListas ? (
              <div className="consulta-estado">No hay cargas disponibles para mostrar</div>
            ) : null}
          </div>
        ) : (
          <table className="tabla-monitoreo">
            <thead>
              <tr>
                <th>Carga</th>
                <th>ID</th>
                <th>ID Notif / RIT</th>
                <th>Codigo</th>
                <th>Hora</th>
                <th>Observacion</th>
                <th>Codigo Lote</th>
                <th>No Urbana</th>
                {!soloLectura ? <th>ACCIÓN</th> : null}
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const enEdicion = editandoId === r.id
                const infoCarga = obtenerInfoCarga(r.carga_id)
                const infoLote = obtenerInfoLote(r.codigo_lote)
                const claseTipo = r.es_no_urbana ? 'tipo-rural' : 'tipo-urbana'
                return (
                  <tr
                    key={r.id}
                    className={`${infoCarga.clase} ${infoLote.clase} ${claseTipo} ${enEdicion ? 'fila-editando' : ''}`.trim()}
                  >
                    <td>
                      <span className={`carga-badge ${infoCarga.clase}`}>{infoCarga.etiqueta}</span>
                    </td>
                    <td>{r.id}</td>
                    <td>
                      {r.id_notificacion ? (
                        r.id_notificacion
                      ) : r.rit ? (
                        <span className="tribunal-badge">{r.rit}-{r.año}</span>
                      ) : (
                        <span className="sin-id">--</span>
                      )}
                    </td>
                    <td>{r.codigo}</td>
                    <td>{r.hora}</td>
                    <td>{r.observacion}</td>
                    <td>
                      {infoLote.mostrar ? (
                        <div className="lote-celda" data-lote={r.codigo_lote || ''}>
                          <span className={`lote-badge ${infoLote.clase}`}>{infoLote.etiqueta}</span>
                          <span className="lote-codigo">{r.codigo_lote}</span>
                        </div>
                      ) : (
                        <span className="lote-codigo lote-codigo-vacio" aria-label="Sin lote visible" />
                      )}
                    </td>
                    <td>
                      <span className={`tipo-badge-monitoreo ${claseTipo}`}>
                        {r.es_no_urbana ? 'No urbana' : 'Urbana'}
                      </span>
                    </td>
                    {!soloLectura ? (
                      <td>
                        {enEdicion ? (
                          <div className="acciones-tabla">
                            <button
                              type="button"
                              className="boton-tabla editar"
                              onClick={() => abrirCambioCodigo(r)}
                              title="Cambiar código"
                            >
                              Código
                            </button>
                            <button
                              type="button"
                              className="boton-tabla guardar"
                              onClick={() => guardarEdicion(r.id)}
                              title="Guardar cambios"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="boton-tabla cancelar"
                              onClick={cancelarEdicion}
                              title="Cancelar edición"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="acciones-tabla">
                            <button
                              type="button"
                              className="boton-tabla editar"
                              onClick={() => abrirEdicion(r)}
                              title="Editar registro"
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              className="boton-tabla editar"
                              onClick={() => abrirCambioCodigo(r)}
                              title="Cambiar código"
                            >
                              Código
                            </button>
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {!soloLectura ? (
        <CodigoDialog
          abierto={codigoDialogAbierto}
          titulo="Cambiar código"
          valorActual={registroCodigoEditando?.codigo ? String(registroCodigoEditando.codigo).trim().toUpperCase() : ''}
          onClose={cerrarCambioCodigo}
          onSelect={seleccionarCodigo}
        />
      ) : null}
    </div>
  )
}

export default MonitoreoLive
