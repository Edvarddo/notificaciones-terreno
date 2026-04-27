import { useState, useEffect } from 'react'
import { obtenerRegistros } from '../services/notificaciones'

export default function ConsultaHistorico({ onVolver }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('todos')
  const [codigoFiltro, setCodigoFiltro] = useState('')

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
    const texto = filtro.toLowerCase()
    const codigoTexto = codigoFiltro.trim().toLowerCase()
    const fechaRegistro = reg.fecha_certificacion || ''

    const coincideFechaDesde = !fechaDesde || fechaRegistro >= fechaDesde
    const coincideFechaHasta = !fechaHasta || fechaRegistro <= fechaHasta
    const coincideTipo =
      tipoFiltro === 'todos' ||
      (tipoFiltro === 'rural' && reg.es_no_urbana) ||
      (tipoFiltro === 'urbana' && !reg.es_no_urbana)
    const coincideCodigo = !codigoTexto || String(reg.codigo || '').toLowerCase().includes(codigoTexto)

    return (
      coincideFechaDesde &&
      coincideFechaHasta &&
      coincideTipo &&
      coincideCodigo &&
      (
        reg.id_notificacion?.toString().includes(texto) ||
        reg.codigo?.toLowerCase().includes(texto) ||
        reg.observacion?.toLowerCase().includes(texto) ||
        fechaRegistro.includes(texto)
      )
    )
  })

  const registrosOrdenados = [...registrosFiltrados].sort((a, b) => {
    const fechaA = `${a.fecha_certificacion || ''}T${String(a.hora || '0000').padStart(4, '0')}`
    const fechaB = `${b.fecha_certificacion || ''}T${String(b.hora || '0000').padStart(4, '0')}`
    return fechaB.localeCompare(fechaA)
  })

  const resumen = registrosOrdenados.reduce(
    (acc, reg) => {
      acc.total += 1
      if (reg.es_no_urbana) acc.rurales += 1
      else acc.urbanas += 1
      return acc
    },
    { total: 0, urbanas: 0, rurales: 0 }
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

  return (
    <div className="consulta-historico-page">
      <div className="consulta-historico-hero">
        <div>
          <p className="consulta-kicker">Consulta histórica</p>
          <h2>Notificaciones de días anteriores</h2>
          <p className="consulta-descripcion">
            Busca por ID, código u observación sin mezclar esta vista con el formulario principal.
          </p>
        </div>

        <button className="boton-secundario boton-volver-consulta" onClick={onVolver}>
          Volver al formulario
        </button>
      </div>

      <div className="consulta-resumen-grid">
        <div className="consulta-resumen-card">
          <span className="consulta-resumen-label">Mostrando</span>
          <strong>{resumen.total}</strong>
        </div>
        <div className="consulta-resumen-card">
          <span className="consulta-resumen-label">Urbanas</span>
          <strong>{resumen.urbanas}</strong>
        </div>
        <div className="consulta-resumen-card">
          <span className="consulta-resumen-label">Rurales</span>
          <strong>{resumen.rurales}</strong>
        </div>
      </div>

      <div className="consulta-filtro-barra">
        <div className="consulta-filtros-grid">
          <input
            type="text"
            placeholder="Buscar por ID, código, fecha u observación..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="input-busqueda input-busqueda-ancha"
          />
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="input-busqueda input-busqueda-ancha"
            aria-label="Fecha desde"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="input-busqueda input-busqueda-ancha"
            aria-label="Fecha hasta"
          />
          <input
            type="text"
            placeholder="Filtrar por codigo"
            value={codigoFiltro}
            onChange={(e) => setCodigoFiltro(e.target.value)}
            className="input-busqueda input-busqueda-ancha"
          />
          <select
            className="input-busqueda input-busqueda-ancha"
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value)}
            aria-label="Tipo"
          >
            <option value="todos">Todos los tipos</option>
            <option value="urbana">Urbanas</option>
            <option value="rural">Rurales</option>
          </select>
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
  )
}
