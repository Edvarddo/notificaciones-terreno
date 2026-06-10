import { useState } from 'react'
import { solicitarPermisoUbicacionInicial } from '../utils/geolocalizacion'

export default function PermisoUbicacionGate({ children }) {
  const [estado, setEstado] = useState(() => {
    return localStorage.getItem('gps_inicializado') === 'true'
      ? 'permitido'
      : 'pendiente'
  })

  const [error, setError] = useState('')

  const permitirUbicacion = async () => {
    setError('')
    setEstado('solicitando')

    try {
      await solicitarPermisoUbicacionInicial()
      localStorage.setItem('gps_inicializado', 'true')
      setEstado('permitido')
    } catch (e) {
      setEstado('pendiente')
      setError(e?.message || 'No se pudo obtener la ubicación')
    }
  }

  if (estado === 'permitido') {
    return children
  }

  return (
    <div className="gps-gate">
      <div className="gps-gate-card">
        <h2>Permitir ubicación</h2>
        <p>
          La aplicación necesita acceso a la ubicación para registrar correctamente
          las notificaciones en terreno.
        </p>

        {error ? <div className="gps-gate-error">{error}</div> : null}

        <button
          type="button"
          className="boton-principal"
          onClick={permitirUbicacion}
          disabled={estado === 'solicitando'}
        >
          {estado === 'solicitando' ? 'Solicitando ubicación...' : 'Permitir ubicación'}
        </button>
      </div>
    </div>
  )
}