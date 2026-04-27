import { useState, useEffect } from 'react'
import { obtenerRegistros } from '../services/notificaciones'

export default function ConsultaHistorico({ onVolver }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('')

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
    return (
      reg.id_notificacion?.toString().includes(texto) ||
      reg.codigo?.toLowerCase().includes(texto) ||
      reg.observacion?.toLowerCase().includes(texto)
    )
  })

  return (
    <div className="consulta-historico-overlay">
      <div className="consulta-historico-modal">
        <div className="modal-header">
          <h2>Histórico de Registros</h2>
          <button className="boton-cerrar" onClick={onVolver}>
            Volver
          </button>
        </div>

        <div className="modal-contenido">
          <div className="busqueda-wrapper">
            <input
              type="text"
              placeholder="Buscar por ID, código u observación..."
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="input-busqueda"
            />
          </div>

          {cargando ? (
            <div className="mensaje-centro">Cargando registros...</div>
          ) : error ? (
            <div className="mensaje-error-centro">{error}</div>
          ) : registrosFiltrados.length === 0 ? (
            <div className="mensaje-centro">No hay registros disponibles</div>
          ) : (
            <div className="tabla-wrapper">
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
                  {registrosFiltrados.map((reg) => (
                    <tr key={reg.id}>
                      <td>{reg.fecha_certificacion}</td>
                      <td className="id-cell">{reg.id_notificacion}</td>
                      <td>{reg.codigo}</td>
                      <td>{reg.observacion}</td>
                      <td>{reg.es_no_urbana ? 'Rural' : 'Urbana'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="modal-footer">
            <p className="info-contador">
              Mostrando {registrosFiltrados.length} de {registros.length} registros
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
