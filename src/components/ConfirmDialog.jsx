import React from 'react'

export default function ConfirmDialog({ 
  abierto, 
  titulo, 
  mensaje, 
  textoConfirmar = 'Confirmar', 
  textoCancel = 'Cancelar',
  colorConfirmar = 'rojo',
  onConfirmar, 
  onCancelar,
  cargando = false,
}) {
  if (!abierto) return null

  return (
    <div className="dialogo-overlay" onClick={onCancelar}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <h3 className="confirm-dialog-titulo">{titulo}</h3>
        </div>
        
        <div className="confirm-dialog-contenido">
          <p className="confirm-dialog-mensaje">{mensaje}</p>
        </div>

        <div className="confirm-dialog-acciones">
          <button 
            type="button" 
            className="boton-confirm-cancel"
            onClick={onCancelar}
            disabled={cargando}
          >
            {textoCancel}
          </button>
          <button 
            type="button" 
            className={`boton-confirm-accion boton-confirm-${colorConfirmar}`}
            onClick={onConfirmar}
            disabled={cargando}
          >
            {cargando ? 'Procesando...' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
