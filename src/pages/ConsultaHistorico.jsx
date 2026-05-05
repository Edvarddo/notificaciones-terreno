import { useState, useEffect } from 'react'
import { obtenerRegistros } from '../services/notificaciones'
import ConsultaMapa from '../components/ConsultaMapa'

const CODIGOS_EXITOSOS = new Set(['D2', 'D4', 'E1'])
const CODIGOS_BUSQUEDA = new Set(['B3', 'B7', 'B10'])
const CODIGOS_NEGATIVOS = new Set(['A1', 'A2', 'A3', 'B5'])

export default function ConsultaHistorico({ onVolver }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const hoy = (() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })()
  // Por defecto filtrar por hoy
  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)

  useEffect(() => {
    cargarHistorico()
  }, [])

  const cargarHistorico = async () => {
    setCargando(true)
    setError('')
    try {
      // Obtener registros de todos los días disponibles
      const hoy = new Date()
      const datos = []
      
      // Intentar cargar registros de los últimos 30 días
      for (let i = 0; i < 30; i++) {
        const fecha = new Date(hoy)
        fecha.setDate(fecha.getDate() - i)
        const y = fecha.getFullYear()
        const m = String(fecha.getMonth() + 1).padStart(2, '0')
        const d = String(fecha.getDate()).padStart(2, '0')
        const fechaStr = `${y}-${m}-${d}`
        
        try {
          const regs = await obtenerRegistros(fechaStr)
          datos.push(...regs)
        } catch (e) {
          // Ignorar error si no hay registros para esa fecha
        }
      }
      
      // Ordenar por fecha descendente
      datos.sort((a, b) => new Date(b.created_at || b.fecha_certificacion) - new Date(a.created_at || a.fecha_certificacion))
      setRegistros(datos)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los registros')
    } finally {
      setCargando(false)
    }
  }

  const registrosFiltrados = registros.filter((reg) => {
    const fechaRegistro = reg.fecha_certificacion || ''
    const coincideFechaDesde = !fechaDesde || fechaRegistro >= fechaDesde
    const coincideFechaHasta = !fechaHasta || fechaRegistro <= fechaHasta
    return coincideFechaDesde && coincideFechaHasta
  })

  const registrosOrdenados = [...registrosFiltrados].sort((a, b) => {
    const fechaA = `${a.fecha_certificacion || ''}T${String(a.hora || '0000').padStart(4, '0')}`
    const fechaB = `${b.fecha_certificacion || ''}T${String(b.hora || '0000').padStart(4, '0')}`
    return fechaB.localeCompare(fechaA)
  })

  const resumen = registrosOrdenados.reduce(
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

  const resumenPorDia = registrosOrdenados.reduce((acc, reg) => {
    const clave = reg.fecha_certificacion || 'Sin fecha'
    if (!acc[clave]) {
      acc[clave] = { total: 0, urbanas: 0, rurales: 0 }
    }
    acc[clave].total += 1
    if (reg.es_no_urbana) acc[clave].rurales += 1
    else acc[clave].urbanas += 1
    return acc
  }, {})

  // calcular puntos (direcciones) y carga total por el conjunto visible
  const cargaTotal = registrosOrdenados.length
  const lotes = new Set()
  for (const r of registrosOrdenados) {
    const clave = String(r.codigo_lote ?? '').trim().toUpperCase()
    if (clave) lotes.add(clave)
  }
  const puntos = lotes.size

  const descargarCsv = () => {
    const filas = registrosOrdenados.map((r) => ({
      id_notificacion: r.id_notificacion ?? '',
      codigo: r.codigo ?? '',
      hora: r.hora ?? '',
      observacion: r.observacion ?? '',
      urbana: r.es_no_urbana ? 'No urbana' : 'Urbana',
    }))

    const escaparCsv = (valor) => {
      const texto = String(valor ?? '')
      if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
        return `"${texto.replace(/"/g, '""')}"`
      }
      return texto
    }

    const encabezado = ['id_notificacion', 'codigo', 'hora', 'observacion', 'urbana']
    const lineas = [
      encabezado.join(','),
      ...filas.map((fila) =>
        [
          escaparCsv(fila.id_notificacion),
          escaparCsv(fila.codigo),
          escaparCsv(fila.hora),
          escaparCsv(fila.observacion),
          escaparCsv(fila.urbana),
        ].join(',')
      ),
    ]

    const contenido = '\uFEFF' + lineas.join('\n')
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `consulta_historico_${fechaDesde || hoy}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // fechas disponibles para filtrar (desde los registros ya cargados)
  const fechasDisponibles = Array.from(
    new Set([hoy, ...registros.map((r) => r.fecha_certificacion || '')])
  )
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))

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
                const v = e.target.value
                setFechaDesde(v)
                setFechaHasta(v)
              }}
              aria-label="Filtrar por día de certificación"
            >
              {fechasDisponibles.length === 0 ? (
                <option value={fechaDesde}>{fechaDesde}</option>
              ) : (
                fechasDisponibles.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))
              )}
            </select>
          </label>
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
      ) : registrosFiltrados.length === 0 ? (
        <div className="consulta-estado">No hay registros disponibles</div>
      ) : (
        <div className="tabla-wrapper consulta-tabla-wrapper">
          <table className="tabla-historico">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>ID Notificación</th>
                <th>Código</th>
                <th>Observación</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {registrosOrdenados.map((reg) => (
                <tr key={reg.id}>
                  <td>{reg.fecha_certificacion}</td>
                  <td className="id-cell">{reg.id_notificacion}</td>
                  <td>{reg.codigo}</td>
                  <td>{reg.observacion}</td>
                  <td>
                    <span className={`tipo-badge tipo-${reg.es_no_urbana ? 'rural' : 'urbana'}`}>
                      {reg.es_no_urbana ? 'RURAL' : 'URB'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  )
}
