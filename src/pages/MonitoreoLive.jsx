import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  obtenerRegistros,
  actualizarRegistroPorId,
  obtenerTodasLasCargasDeUnDia,
} from '../services/notificaciones'
import CodigoDialog from '../features/CodigoDialog'

function AjustarMapa({ puntos }) {
  const map = useMap()
  const yaAjustoRef = useRef(false)

  useEffect(() => {
    if (!puntos.length) return
    if (yaAjustoRef.current) return

    const bounds = L.latLngBounds(
      puntos.map((p) => [Number(p.latitud), Number(p.longitud)])
    )

    map.fitBounds(bounds, { padding: [35, 35] })
    yaAjustoRef.current = true
  }, [map, puntos])

  return null
}

function crearIconoPunto(numero, total) {
  return L.divIcon({
    className: 'mapa-punto-wrapper',
    html: `
      <div class="mapa-punto">
        <span>${numero}</span>
        ${total > 1 ? `<small>${total}</small>` : ''}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  })
}

function obtenerMinutosHora(hora) {
  const texto = String(hora || '').replace(/\D/g, '').padStart(4, '0').slice(-4)
  const hh = Number(texto.slice(0, 2))
  const mm = Number(texto.slice(2, 4))

  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return -1
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return -1

  return hh * 60 + mm
}

function MonitoreoLive({
  fechaCertificacion,
  cargaId,
  soloLectura = false,
  esperandoCargaActiva = false,
}) {
  const [registros, setRegistros] = useState([])
  const [cargasDelDia, setCargasDelDia] = useState([])
  const [editandoId, setEditandoId] = useState(null)
  const [esRebajadaEdit, setEsRebajadaEdit] = useState(false)
  const [codigoLoteEdit, setCodigoLoteEdit] = useState('')
  const [codigoDialogAbierto, setCodigoDialogAbierto] = useState(false)
  const [registroCodigoEditando, setRegistroCodigoEditando] = useState(null)
  const [cargasListas, setCargasListas] = useState(false)
  const [grupoSeleccionadoId, setGrupoSeleccionadoId] = useState('')
  const [pollingActive, setPollingActive] = useState(false)
  const [lastRefetch, setLastRefetch] = useState(null)
  const [refetchCount, setRefetchCount] = useState(0)
  const [toastNuevoRegistro, setToastNuevoRegistro] = useState(null)

  const mounted = useRef(true)
  const pollingRef = useRef(null)
  const idsRegistrosPreviosRef = useRef(new Set())
  const primeraCargaRef = useRef(true)
  const toastTimeoutRef = useRef(null)

  const obtenerNumeroCarga = (carga, fallbackIndex = 0) => {
    const numero = Number(carga?.numero_carga)
    if (Number.isFinite(numero) && numero > 0) return numero
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
        if (!cargaIdRegistro || idsVistos.has(cargaIdRegistro)) return

        idsVistos.add(cargaIdRegistro)
        idsOrdenados.push(cargaIdRegistro)
      })

      idsOrdenados.forEach((id, index) => {
        mapa.set(id, {
          numero: index + 1,
          clase: `carga-${(index % 6) + 1}`,
        })
      })
    }

    return mapa
  }, [cargasDelDia, registros])

  const registrosConGps = useMemo(() => {
    return registros.filter((r) => {
      const lat = Number(r.latitud)
      const lng = Number(r.longitud)
      return Number.isFinite(lat) && Number.isFinite(lng)
    })
  }, [registros])

  const obtenerInfoCarga = (cargaIdFila) => {
    const id = String(cargaIdFila || '')
    if (!id) return { etiqueta: 'Sin carga', clase: 'carga-sin-dato' }

    const carga = mapaCargas.get(id)
    if (!carga) return { etiqueta: 'Carga', clase: 'carga-desconocida' }

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
    if (!id) return { etiqueta: 'Sin lote', clase: 'lote-sin-dato' }

    const lote = mapaLotes.get(id)
    if (!lote) return { etiqueta: id, clase: 'lote-desconocido', mostrar: false }

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
      if (!grupos.has(cargaIdRegistro)) grupos.set(cargaIdRegistro, [])
      grupos.get(cargaIdRegistro).push(registro)
    })

    const entradas = [...grupos.entries()]
    entradas.sort((a, b) => {
      const infoA =
        a[0] === 'sin-carga'
          ? { numero: Number.POSITIVE_INFINITY }
          : mapaCargas.get(a[0]) || { numero: Number.POSITIVE_INFINITY }

      const infoB =
        b[0] === 'sin-carga'
          ? { numero: Number.POSITIVE_INFINITY }
          : mapaCargas.get(b[0]) || { numero: Number.POSITIVE_INFINITY }

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
    return registrosAgrupadosPorCarga.slice().sort((a, b) => {
      const numeroA = a.cargaInfo?.numero || Number.POSITIVE_INFINITY
      const numeroB = b.cargaInfo?.numero || Number.POSITIVE_INFINITY
      return numeroA - numeroB
    })
  }, [registrosAgrupadosPorCarga])

  useEffect(() => {
    if (!soloLectura) return

    const primerGrupo = gruposPublicos[0]
    if (!primerGrupo) {
      if (grupoSeleccionadoId !== '') setGrupoSeleccionadoId('')
      return
    }

    const grupoExiste = gruposPublicos.some((grupo) => grupo.cargaId === grupoSeleccionadoId)
    if (!grupoExiste) setGrupoSeleccionadoId(primerGrupo.cargaId)
  }, [grupoSeleccionadoId, gruposPublicos, soloLectura])

  const grupoPublicoActivo = useMemo(() => {
    if (!soloLectura) return null
    if (!gruposPublicos.length) return null
    return gruposPublicos.find((grupo) => grupo.cargaId === grupoSeleccionadoId) || gruposPublicos[0]
  }, [gruposPublicos, grupoSeleccionadoId, soloLectura])

  const registrosMapaVisibles = useMemo(() => {
    if (soloLectura && grupoPublicoActivo) {
      return grupoPublicoActivo.registros.filter((r) => {
        const lat = Number(r.latitud)
        const lng = Number(r.longitud)
        return Number.isFinite(lat) && Number.isFinite(lng)
      })
    }

    return registrosConGps
  }, [grupoPublicoActivo, registrosConGps, soloLectura])

  const puntosMapa = useMemo(() => {
    const mapa = new Map()

    registrosMapaVisibles.forEach((r) => {
      const lat = Number(r.latitud)
      const lng = Number(r.longitud)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`

      if (!mapa.has(key)) {
        mapa.set(key, {
          latitud: lat,
          longitud: lng,
          registros: [],
          horaMaximaMinutos: -1,
        })
      }

      const punto = mapa.get(key)
      punto.registros.push(r)
      punto.horaMaximaMinutos = Math.max(
        punto.horaMaximaMinutos,
        obtenerMinutosHora(r.hora)
      )
    })

    return [...mapa.values()]
      .sort((a, b) => {
        if (a.horaMaximaMinutos !== b.horaMaximaMinutos) {
          return a.horaMaximaMinutos - b.horaMaximaMinutos
        }

        const idA = Math.min(...a.registros.map((r) => Number(r.id) || Infinity))
        const idB = Math.min(...b.registros.map((r) => Number(r.id) || Infinity))
        return idA - idB
      })
      .map((punto, index) => ({
        ...punto,
        numero: index + 1,
      }))
  }, [registrosMapaVisibles])

  const mapaSecuenciaPorRegistro = useMemo(() => {
    const mapa = new Map()

    puntosMapa.forEach((punto) => {
      punto.registros.forEach((registro) => {
        mapa.set(registro.id, punto.numero)
      })
    })

    return mapa
  }, [puntosMapa])

  const obtenerSecuenciaPunto = (registro) => {
    return mapaSecuenciaPorRegistro.get(registro.id) || '--'
  }

  const obtenerInfoGrupo = (grupo) => {
    if (grupo.cargaId === 'sin-carga') {
      return { titulo: 'Sin carga', clase: 'carga-sin-dato' }
    }

    const numero = grupo.cargaInfo?.numero || 0
    const clase = grupo.cargaInfo?.clase || 'carga-desconocida'
    return { titulo: `Carga ${numero}`, clase }
  }

  const crearUrlStreetView = (latitud, longitud) => {
    const lat = Number(latitud)
    const lng = Number(longitud)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`
  }

  const obtenerTextoCoordenadas = (latitud, longitud) => {
    const lat = Number(latitud)
    const lng = Number(longitud)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }

  const renderCeldaMapa = (registro) => {
    const urlStreetView = crearUrlStreetView(registro.latitud, registro.longitud)
    const textoCoordenadas = obtenerTextoCoordenadas(registro.latitud, registro.longitud)

    return (
      <td>
        {urlStreetView ? (
          <div className="acciones-tabla">
            <a
              href={urlStreetView}
              target="_blank"
              rel="noreferrer"
              className="boton-tabla editar"
              title={textoCoordenadas ? `Ver Street View: ${textoCoordenadas}` : 'Ver Street View'}
            >
              Street View
            </a>

            <span className="lote-codigo">{textoCoordenadas}</span>
          </div>
        ) : (
          <span className="sin-id">Sin GPS</span>
        )}
      </td>
    )
  }

  useEffect(() => {
    const idsActuales = new Set(registros.map((r) => r.id))

    if (primeraCargaRef.current) {
      idsRegistrosPreviosRef.current = idsActuales
      primeraCargaRef.current = false
      return
    }

    const nuevos = registros.filter((r) => !idsRegistrosPreviosRef.current.has(r.id))

    if (nuevos.length > 0) {
      const nuevo = nuevos
        .slice()
        .sort((a, b) => Number(b.id) - Number(a.id))[0]

      const punto = obtenerSecuenciaPunto(nuevo)

      setToastNuevoRegistro({
        id: nuevo.id,
        texto: nuevo.id_notificacion
          ? `Nueva notificación ${nuevo.id_notificacion}`
          : nuevo.rit
            ? `Nuevo registro ${nuevo.rit}-${nuevo.año || ''}`
            : `Nuevo registro ${nuevo.id}`,
        detalle: `Punto ${punto} · ${nuevo.codigo || '--'} · ${nuevo.hora || '--'}`,
      })

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }

      toastTimeoutRef.current = window.setTimeout(() => {
        setToastNuevoRegistro(null)
        toastTimeoutRef.current = null
      }, 4500)
    }

    idsRegistrosPreviosRef.current = idsActuales
  }, [registros, mapaSecuenciaPorRegistro])

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

    const pollInterval = setInterval(async () => {
      try {
        const data = await obtenerRegistros(fechaCertificacion, cargaId)
        if (!mounted.current) return

        setRegistros(data || [])
        setLastRefetch(new Date())
        setRefetchCount((prev) => prev + 1)
      } catch (e) {
        console.warn('Polling error', e)
      }
    }, 10000)

    pollingRef.current = pollInterval
    setPollingActive(true)

    return () => {
      mounted.current = false

      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }

      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
        toastTimeoutRef.current = null
      }

      setPollingActive(false)
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
          setCargasDelDia(listaFiltrada)
          setCargasListas(true)
          return
        }
      } catch (error) {
        // fallback
      }

      const listaFallback = idsUnicos.map((id) => ({ id }))
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

  return (
    <div className="monitoreo-live pagina-desktop-only">
      <h2>{soloLectura ? 'Monitoreo público' : 'Monitoreo por refetch'}</h2>

      <p className="kicker">
        {soloLectura
          ? esperandoCargaActiva
            ? 'Sin carga activa por ahora. La tabla queda vacía esperando la siguiente carga.'
            : 'Vista pública de solo lectura, con refresco automático cada 10 segundos.'
          : 'Notificaciones subidas desde terreno, con refresco automático cada 10 segundos.'}
      </p>

      {toastNuevoRegistro ? (
        <div className="toast-nuevo-registro">
          <strong>{toastNuevoRegistro.texto}</strong>
          <span>{toastNuevoRegistro.detalle}</span>
        </div>
      ) : null}

      <div className="monitoreo-mapa">
        <MapContainer center={[-22.466, -68.93]} zoom={13} className="leaflet-monitor">
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <AjustarMapa puntos={puntosMapa} />

          {puntosMapa.map((punto) => (
            <Marker
              key={`${punto.latitud}-${punto.longitud}`}
              position={[punto.latitud, punto.longitud]}
              icon={crearIconoPunto(punto.numero, punto.registros.length)}
            >
              <Popup>
                <div className="popup-mapa">
                  <div className="popup-mapa-header">Punto {punto.numero}</div>

                  <div className="popup-mapa-grid">
                    <span>Total</span>
                    <strong>{punto.registros.length} registro(s)</strong>

                    <span>Coord.</span>
                    <strong>
                      {punto.latitud.toFixed(6)}, {punto.longitud.toFixed(6)}
                    </strong>
                  </div>

                  <div className="popup-mapa-lista">
                    {punto.registros.map((r) => (
                      <div key={r.id} className="popup-mapa-registro">
                        <strong>
                          {r.id_notificacion
                            ? r.id_notificacion
                            : r.rit
                              ? `${r.rit}-${r.año || ''}`
                              : `Registro ${r.id}`}
                        </strong>
                        <span>
                          {r.codigo || '--'} · {r.hora || '--'}
                        </span>
                        <small>{r.observacion || 'Sin observación'}</small>
                      </div>
                    ))}
                  </div>

                  <a
                    href={crearUrlStreetView(punto.latitud, punto.longitud)}
                    target="_blank"
                    rel="noreferrer"
                    className="popup-mapa-link"
                  >
                    Abrir Street View
                  </a>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

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
                {grupoPublicoActivo
                  ? `${grupoPublicoActivo.registros.length} registro(s)`
                  : 'Sin cargas disponibles'}
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
                      <th>Punto</th>
                      <th>ID</th>
                      <th>ID Notif / RIT</th>
                      <th>Código</th>
                      <th>Hora</th>
                      <th>Observación</th>
                      <th>Código Lote</th>
                      <th>No Urbana</th>
                      <th>Street View</th>
                    </tr>
                  </thead>

                  <tbody>
                    {grupoPublicoActivo.registros.map((r) => {
                      const infoLote = obtenerInfoLote(r.codigo_lote)
                      const claseTipo = r.es_no_urbana ? 'tipo-rural' : 'tipo-urbana'

                      return (
                        <tr key={r.id} className={`${infoLote.clase} ${claseTipo}`.trim()}>
                          <td>
                            <span className="punto-tabla-badge">
                              {obtenerSecuenciaPunto(r)}
                            </span>
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

                          {renderCeldaMapa(r)}
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
                <th>Punto</th>
                <th>Carga</th>
                <th>ID</th>
                <th>ID Notif / RIT</th>
                <th>Codigo</th>
                <th>Hora</th>
                <th>Observacion</th>
                <th>Codigo Lote</th>
                <th>No Urbana</th>
                <th>Street View</th>
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
                    className={`${infoCarga.clase} ${infoLote.clase} ${claseTipo} ${
                      enEdicion ? 'fila-editando' : ''
                    }`.trim()}
                  >
                    <td>
                      <span className="punto-tabla-badge">
                        {obtenerSecuenciaPunto(r)}
                      </span>
                    </td>

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

                    {renderCeldaMapa(r)}

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
          valorActual={
            registroCodigoEditando?.codigo
              ? String(registroCodigoEditando.codigo).trim().toUpperCase()
              : ''
          }
          onClose={cerrarCambioCodigo}
          onSelect={seleccionarCodigo}
        />
      ) : null}
    </div>
  )
}

export default MonitoreoLive