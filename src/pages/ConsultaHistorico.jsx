import { useEffect, useMemo, useState } from 'react'
import ConsultaMapa from '../components/ConsultaMapa'
import { obtenerRegistros, obtenerTodasLasCargasDeUnDia } from '../services/notificaciones'
import { escaparValorCsv } from '../utils/csv'
import {
  CODIGOS_BUSQUEDA,
  CODIGOS_EXITOSOS,
  CODIGOS_NEGATIVOS,
} from '../constants/codigos'

const esCoordenadaValida = (valor) => Number.isFinite(valor) && Math.abs(valor) > 0

const obtenerHoyIso = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ConsultaHistorico({ onVolver }) {
  const hoy = obtenerHoyIso()
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [cargas, setCargas] = useState([])
  const [cargaId, setCargaId] = useState('')

  useEffect(() => {
    void cargarHistorico()
  }, [])

  // Derivar las cargas disponibles a partir de los registros ya cargados
  useEffect(() => {
    let cancelled = false

    const calcularCargas = async () => {
      const registrosDelDia = registros.filter((r) => (r.fecha_certificacion || '') === fechaDesde)
      const idsUnicos = Array.from(new Set(registrosDelDia.map((r) => r.carga_id).filter(Boolean)))

      try {
        // Intentar obtener las cargas con timestamps (para numerarlas cronológicamente)
        const listaTodas = await obtenerTodasLasCargasDeUnDia(fechaDesde)
        if (cancelled) return

        // Asegurar orden explícita por fecha de creación (ascendente)
        const todasOrdenadas = (listaTodas || []).slice().sort((a, b) => {
          const ta = a?.creada_en ? new Date(a.creada_en).getTime() : 0
          const tb = b?.creada_en ? new Date(b.creada_en).getTime() : 0
          return ta - tb
        })

        // Filtrar por las cargas que realmente tienen registros y mantener el orden por creada_en
        const listaFiltrada = todasOrdenadas.filter((c) => idsUnicos.includes(c.id))

        if (listaFiltrada.length) {
          setCargas(listaFiltrada)
          setCargaId((prev) => (prev && listaFiltrada.some((c) => String(c.id) === String(prev)) ? prev : ''))
          return
        }
      } catch (err) {
        // si falla la consulta (RLS/CORS), seguimos con el método derivado
      }

      // Fallback: derivar a partir de registros si no obtuvimos la lista de cargas
      // Ordenar las cargas por el primer registro asociado (aprox. a creada_en)
      const primerRegistroPorCarga = {}
      for (const id of idsUnicos) {
        const regs = registrosDelDia.filter((r) => String(r.carga_id || '') === String(id))
        // calcular timestamp aproximado usando fecha + hora (hora en formato HHMM o similar)
        const times = regs.map((r) => {
          const horaTexto = String(r.hora || '0000').padStart(4, '0')
          const hh = horaTexto.slice(0, 2)
          const mm = horaTexto.slice(2, 4)
          const d = new Date(`${fechaDesde}T${hh}:${mm}:00`).getTime()
          return Number.isFinite(d) ? d : Infinity
        })
        primerRegistroPorCarga[id] = times.length ? Math.min(...times) : Infinity
      }

      const idsOrdenados = idsUnicos.slice().sort((a, b) => (primerRegistroPorCarga[a] || Infinity) - (primerRegistroPorCarga[b] || Infinity))
      const lista = idsOrdenados.map((id) => ({ id }))
      setCargas(lista)
      setCargaId((prev) => (prev && lista.some((c) => String(c.id) === String(prev)) ? prev : ''))
    }

    void calcularCargas()

    return () => {
      cancelled = true
    }
  }, [fechaDesde, registros])

  const cargarHistorico = async () => {
    setCargando(true)
    setError('')

    try {
      const fechas = []
      const base = new Date()

      for (let i = 0; i < 30; i += 1) {
        const fecha = new Date(base)
        fecha.setDate(base.getDate() - i)
        const y = fecha.getFullYear()
        const m = String(fecha.getMonth() + 1).padStart(2, '0')
        const d = String(fecha.getDate()).padStart(2, '0')
        fechas.push(`${y}-${m}-${d}`)
      }

      const resultados = await Promise.all(
        fechas.map(async (fecha) => {
          try {
            return await obtenerRegistros(fecha)
          } catch {
            return []
          }
        })
      )

      const datos = resultados.flat()
      datos.sort((a, b) => {
        const fechaA = `${a.fecha_certificacion || ''}T${String(a.hora || '0000').padStart(4, '0')}`
        const fechaB = `${b.fecha_certificacion || ''}T${String(b.hora || '0000').padStart(4, '0')}`
        return fechaB.localeCompare(fechaA)
      })

      setRegistros(datos)
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar los registros')
    } finally {
      setCargando(false)
    }
  }

  const fechasDisponibles = useMemo(() => {
    return Array.from(new Set([hoy, ...registros.map((r) => r.fecha_certificacion || '')]))
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a))
  }, [hoy, registros])

  const registrosFiltrados = useMemo(() => {
    return registros.filter((reg) => {
      const fechaRegistro = reg.fecha_certificacion || ''
      const coincideDesde = !fechaDesde || fechaRegistro >= fechaDesde
      const coincideHasta = !fechaHasta || fechaRegistro <= fechaHasta
      const coincideCarga = !cargaId || String(reg.carga_id || '') === String(cargaId)
      return coincideDesde && coincideHasta && coincideCarga
    })
  }, [fechaDesde, fechaHasta, registros, cargaId])

  const registrosOrdenados = useMemo(() => {
    return [...registrosFiltrados].sort((a, b) => {
      const fechaA = `${a.fecha_certificacion || ''}T${String(a.hora || '0000').padStart(4, '0')}`
      const fechaB = `${b.fecha_certificacion || ''}T${String(b.hora || '0000').padStart(4, '0')}`
      return fechaB.localeCompare(fechaA)
    })
  }, [registrosFiltrados])

  const secuenciaPorId = useMemo(() => {
    const normalizados = registrosFiltrados
      .filter((registro) => esCoordenadaValida(Number(registro.latitud)) && esCoordenadaValida(Number(registro.longitud)))
      .map((registro, idx) => ({
        id: registro.id,
        fecha: String(registro.fecha_certificacion || '').trim(),
        hora: String(registro.hora || '0000').trim(),
        codigoLote: String(registro.codigo_lote || '').trim().toUpperCase(),
        indiceOriginal: idx,
      }))
      .map((registro) => {
        const horaTexto = String(registro.hora || '0000').padStart(4, '0')
        const hh = horaTexto.slice(0, 2)
        const mm = horaTexto.slice(2, 4)
        const marcaTemporal = new Date(`${registro.fecha}T${hh}:${mm}:00`).getTime()
        return {
          ...registro,
          marcaTemporal: Number.isFinite(marcaTemporal) ? marcaTemporal : Number.POSITIVE_INFINITY,
        }
      })

    const conteoLotes = normalizados.reduce((acc, registro) => {
      if (!registro.codigoLote) return acc
      acc.set(registro.codigoLote, (acc.get(registro.codigoLote) || 0) + 1)
      return acc
    }, new Map())

    const grupos = new Map()
    const individuales = []

    normalizados.forEach((registro) => {
      const esLoteAgrupado = registro.codigoLote && (conteoLotes.get(registro.codigoLote) || 0) > 1
      if (esLoteAgrupado) {
        const actual = grupos.get(registro.codigoLote) || []
        actual.push(registro)
        grupos.set(registro.codigoLote, actual)
      } else {
        individuales.push(registro)
      }
    })

    const unidades = [
      ...Array.from(grupos.entries()).map(([codigoLote, items]) => ({
        tipo: 'lote',
        codigoLote,
        items: items.slice().sort((a, b) => a.marcaTemporal - b.marcaTemporal),
        marcaTemporal: items.reduce((min, item) => Math.min(min, item.marcaTemporal), Number.POSITIVE_INFINITY),
      })),
      ...individuales.map((item) => ({
        tipo: 'individual',
        items: [item],
        marcaTemporal: item.marcaTemporal,
      })),
    ].sort((a, b) => a.marcaTemporal - b.marcaTemporal)

    const mapa = new Map()
    let secuencia = 1

    unidades.forEach((unidad) => {
      unidad.items.forEach((item, index) => {
        mapa.set(item.id, {
          secuencia,
          interno: index + 1,
          totalInterno: unidad.items.length,
          esLote: unidad.tipo === 'lote',
        })
      })
      secuencia += 1
    })

    return mapa
  }, [registrosFiltrados])

  const resumen = useMemo(() => {
    return registrosOrdenados.reduce(
      (acc, reg) => {
        const codigo = String(reg.codigo ?? '').trim().toUpperCase()

        acc.total += 1
        if (reg.es_no_urbana) acc.rurales += 1
        else acc.urbanas += 1

        if (CODIGOS_EXITOSOS.has(codigo)) acc.realizadas += 1
        else if (CODIGOS_BUSQUEDA.has(codigo)) acc.busquedas += 1
        else if (CODIGOS_NEGATIVOS.has(codigo)) acc.negativas += 1
        else acc.otros += 1

        return acc
      },
      { total: 0, urbanas: 0, rurales: 0, realizadas: 0, negativas: 0, busquedas: 0, otros: 0 }
    )
  }, [registrosOrdenados])

  const resumenPorDia = useMemo(() => {
    return registrosOrdenados.reduce((acc, reg) => {
      const clave = reg.fecha_certificacion || 'Sin fecha'
      if (!acc[clave]) {
        acc[clave] = { total: 0, urbanas: 0, rurales: 0 }
      }
      acc[clave].total += 1
      if (reg.es_no_urbana) acc[clave].rurales += 1
      else acc[clave].urbanas += 1
      return acc
    }, {})
  }, [registrosOrdenados])

  const cargaTotal = registrosFiltrados.length
  const puntos = new Set(registrosFiltrados.map((reg) => String(reg.codigo_lote ?? '').trim()).filter(Boolean)).size

  const descargarCsv = () => {
    const filas = registrosOrdenados.map((r) => ({
      id_notificacion: r.id_notificacion ?? '',
      codigo: r.codigo ?? '',
      hora: r.hora ?? '',
      observacion: r.observacion ?? '',
      urbana: r.es_no_urbana ? 'No urbana' : 'Urbana',
    }))

    const encabezado = ['id_notificacion', 'codigo', 'hora', 'observacion', 'urbana']
    const lineas = [
      encabezado.join(','),
      ...filas.map((fila) =>
        [
          escaparValorCsv(fila.id_notificacion),
          escaparValorCsv(fila.codigo),
          escaparValorCsv(fila.hora),
          escaparValorCsv(fila.observacion),
          escaparValorCsv(fila.urbana),
        ].join(',')
      ),
    ]

    const contenido = '\uFEFF' + lineas.join('\n')
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const enlace = document.createElement('a')
    enlace.href = url
    const cargaLabel = cargaId ? `carga_${(cargas.findIndex((c) => c.id === cargaId) + 1) || cargaId}` : 'todas_cargas'
    enlace.download = `consulta_historico_${fechaDesde || hoy}_${cargaLabel}.csv`
    document.body.appendChild(enlace)
    enlace.click()
    document.body.removeChild(enlace)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="consulta-historico-page">
      <div className="consulta-contenedor-web consulta-contenedor-web-ancha">
        <div className="consulta-historico-hero">
          <div>
            <p className="consulta-kicker">Consulta histórica</p>
            <h2>Notificaciones de días anteriores</h2>
            <p className="consulta-descripcion">
              Busca por ID, código u observación sin mezclar esta vista con el formulario principal.
            </p>
          </div>

          <div className="consulta-hero-acciones">
            <button className="boton-mini" type="button" onClick={descargarCsv} disabled={cargando || registrosOrdenados.length === 0}>
              Descargar CSV
            </button>
            <button className="boton-secundario boton-volver-consulta" onClick={onVolver}>
              Volver al formulario
            </button>
          </div>
        </div>

        <div className="consulta-resumen-grid">
          <div className="consulta-resumen-card">
            <span className="consulta-resumen-label">Carga total</span>
            <strong>{cargaTotal}</strong>
          </div>

          <div className="consulta-resumen-card">
            <span className="consulta-resumen-label">Puntos</span>
            <strong>{puntos}</strong>
          </div>

          <div className="consulta-resumen-card">
            <span className="consulta-resumen-label">Realizadas</span>
            <strong>{resumen.realizadas}</strong>
          </div>

          <div className="consulta-resumen-card">
            <span className="consulta-resumen-label">Negativas</span>
            <strong>{resumen.negativas}</strong>
          </div>

          <div className="consulta-resumen-card">
            <span className="consulta-resumen-label">Búsquedas</span>
            <strong>{resumen.busquedas}</strong>
          </div>

          <div className="consulta-resumen-card">
            <span className="consulta-resumen-label">Rurales</span>
            <strong>{resumen.rurales}</strong>
          </div>

          <div className="consulta-resumen-card">
            <span className="consulta-resumen-label">Urbanas</span>
            <strong>{resumen.urbanas}</strong>
          </div>
        </div>

        <ConsultaMapa registros={registrosOrdenados} />

        <div className="consulta-filtro-barra">
          <div className="consulta-filtros-grid consulta-filtro-unico">
            <label className="consulta-filtro-fecha">
              <span className="consulta-filtro-label">Fecha de certificación</span>
              <select
                className="input-busqueda input-busqueda-ancha consulta-filtro-select"
                value={fechaDesde}
                onChange={(e) => {
                  const valor = e.target.value
                  setFechaDesde(valor)
                  setFechaHasta(valor)
                }}
                aria-label="Filtrar por día de certificación"
              >
                {fechasDisponibles.length === 0 ? (
                  <option value={fechaDesde}>{fechaDesde}</option>
                ) : (
                  fechasDisponibles.map((fecha) => (
                    <option key={fecha} value={fecha}>
                      {fecha}
                    </option>
                  ))
                )}
              </select>
            </label>
              <label className="consulta-filtro-fecha">
                <span className="consulta-filtro-label">Carga</span>
                <select
                  className="input-busqueda input-busqueda-ancha consulta-filtro-select"
                  value={cargaId}
                  onChange={(e) => setCargaId(e.target.value)}
                  aria-label="Filtrar por carga"
                  disabled={cargas.length === 0}
                >
                  <option value="">Todas las cargas</option>
                  {cargas.map((carga, idx) => {
                    const numeroCarga = Number.isFinite(Number(carga?.numero_carga)) ? Number(carga.numero_carga) : idx + 1
                    const created = carga?.creada_en ? new Date(carga.creada_en) : null
                    let createdText = ''
                    if (created) {
                      createdText = `${created.toLocaleDateString()} ${created.toLocaleTimeString()}`
                    } else {
                      // fallback: buscar el primer registro asociado para aproximar la hora
                      const primerRegistro = registros.find(
                        (r) => String(r.carga_id || '') === String(carga.id) && (r.fecha_certificacion || '') === fechaDesde
                      )
                      if (primerRegistro) {
                        const horaTexto = String(primerRegistro.hora || '0000').padStart(4, '0')
                        const hh = horaTexto.slice(0, 2)
                        const mm = horaTexto.slice(2, 4)
                        createdText = `${fechaDesde} ${hh}:${mm}`
                      }
                    }

                    const idTail = carga.id ? `(${String(carga.id).slice(0, 8)})` : ''

                    return (
                      <option key={carga.id} value={carga.id}>
                        {`Carga ${numeroCarga}${createdText ? ' — ' + createdText : ''}${idTail ? ' ' + idTail : ''}`}
                      </option>
                    )
                  })}
                </select>
              </label>
              {/* Carga selector populated from registros */}
          </div>
        </div>

        <div className="consulta-resumen-diario">
          {Object.entries(resumenPorDia).slice(0, 5).map(([fecha, datos]) => (
            <div key={fecha} className="consulta-dia-card">
              <strong>{fecha}</strong>
              <span>{datos.total} total</span>
              <span>{datos.urbanas} urbanas / {datos.rurales} rurales</span>
            </div>
          ))}
        </div>

        {cargando ? (
          <div className="consulta-estado">Cargando registros...</div>
        ) : error ? (
          <div className="consulta-estado consulta-estado-error">{error}</div>
        ) : registrosOrdenados.length === 0 ? (
          <div className="consulta-estado">No hay registros disponibles</div>
        ) : (
          <div className="tabla-wrapper consulta-tabla-wrapper">
            <table className="tabla-historico">
              <thead>
                <tr>
                  <th>Secuencia</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>ID Notificación</th>
                  <th>Código</th>
                  <th>Observación</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {registrosOrdenados.map((reg) => {
                  const secuenciaInfo = secuenciaPorId.get(reg.id) || { secuencia: '--', interno: 1, totalInterno: 1, esLote: false }

                  return (
                  <tr key={reg.id}>
                    <td>
                      <div className="secuencia-celda">
                        <strong>{secuenciaInfo.secuencia}</strong>
                        {secuenciaInfo.esLote ? (
                          <span className="secuencia-subtexto">{secuenciaInfo.interno}/{secuenciaInfo.totalInterno}</span>
                        ) : null}
                      </div>
                    </td>
                    <td>{reg.fecha_certificacion}</td>
                    <td>{String(reg.hora || '').trim() || '--'}</td>
                    <td className="id-cell">{reg.id_notificacion}</td>
                    <td>{reg.codigo}</td>
                    <td>{reg.observacion}</td>
                    <td>
                      <span className={`tipo-badge tipo-${reg.es_no_urbana ? 'rural' : 'urbana'}`}>
                        {reg.es_no_urbana ? 'RURAL' : 'URB'}
                      </span>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}