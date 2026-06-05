import { useState } from 'react'

function SessionSidebar({ initials, remainingLabel, onLogout }) {
  const [abierto, setAbierto] = useState(false)

  const cerrarSesion = () => {
    const ok = window.confirm('¿Cerrar la sesión activa?')
    if (ok) onLogout?.()
  }

  return (
    <>
      <button
        type="button"
        className="session-sidebar-toggle"
        onClick={() => setAbierto(true)}
        aria-label="Abrir sesión"
      >
        {initials || 'U'}
      </button>

      {abierto ? (
        <div
          className="session-sidebar-overlay"
          onClick={() => setAbierto(false)}
        >
          <aside
            className="session-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="session-sidebar-header">
              <button
                type="button"
                className="session-sidebar-close"
                onClick={() => setAbierto(false)}
              >
                ✕
              </button>

              <div className="session-sidebar-avatar">
                {initials || 'U'}
              </div>

              <span className="session-sidebar-kicker">
                Sesión activa
              </span>

              <h3>Usuario {initials || '—'}</h3>

              <p>Expira en {remainingLabel}</p>
            </div>

            <button
              type="button"
              className="session-sidebar-logout"
              onClick={cerrarSesion}
            >
              Cerrar sesión
            </button>
          </aside>
        </div>
      ) : null}
    </>
  )
}

export default SessionSidebar