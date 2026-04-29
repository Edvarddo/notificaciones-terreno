function MenuLateral({ abierto, vistaConsulta, onCerrar, onIrConsulta, onIrFormulario, onIrMonitoreo, vistaMonitoreo }) {
  if (!abierto) return null

  return (
    <>
      <div className="menu-backdrop" onClick={onCerrar} />
      <aside className="menu-sidebar" aria-label="Menu principal">
        <div className="menu-sidebar-header">
          <span>Navegación</span>
          <button type="button" className="menu-cerrar" aria-label="Cerrar menu" onClick={onCerrar}>
            ×
          </button>
        </div>

        <button
          type="button"
          className={`menu-item ${!vistaConsulta ? 'menu-item-activo' : ''}`}
          onClick={onIrFormulario}
        >
          Formulario principal
        </button>

        <button
          type="button"
          className={`menu-item ${vistaConsulta ? 'menu-item-activo' : ''}`}
          onClick={onIrConsulta}
        >
          Consulta de notificaciones
        </button>

        <button
          type="button"
          className={`menu-item ${vistaMonitoreo ? 'menu-item-activo' : ''}`}
          onClick={onIrMonitoreo}
        >
          Monitoreo en vivo (solo web)
        </button>

        <div className="menu-sidebar-footer">
          <p>Acceso rápido sin interferir con el formulario.</p>
        </div>
      </aside>
    </>
  )
}

export default MenuLateral