import { useState, useEffect } from 'react'

export default function DailyCodeModal({ open, onClose, onSubmit, verifying, error }) {
  const [code, setCode] = useState('')

  useEffect(() => {
    if (open) setCode('')
  }, [open])

  if (!open) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!/^[0-9]{6}$/.test(code)) return
    await onSubmit(code)
  }

  return (
    <div className="dialogo-overlay top" onClick={onClose}>
      <div className="dialogo-codigos" onClick={(e) => e.stopPropagation()}>
        <div className="dialogo-header">
          <h3 className="dialogo-titulo">Acceso</h3>
        </div>

        <form className="dialogo-contenido" onSubmit={handleSubmit}>
          <p>Introduce el código de acceso de 6 dígitos proporcionado por el servidor.</p>
          <input
            autoFocus
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
          />

          {error ? <div className="mensaje-error">{error}</div> : null}

          <div className="acciones-confirmar-eliminar">
            <button type="button" className="boton-secundario" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="boton-primario" disabled={verifying || !/^[0-9]{6}$/.test(code)}>
              {verifying ? 'Verificando...' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
