import { CODIGOS } from '../constants/codigos'

function CodigoDialog({
  abierto,
  titulo,
  valorActual,
  onClose,
  onSelect,
  top = false,
}) {
  if (!abierto) return null

  return (
    <div
      className={`dialogo-overlay ${top ? 'top' : ''}`}
      onClick={onClose}
    >
      <div className="dialogo-codigos" onClick={(e) => e.stopPropagation()}>
        <div className="dialogo-header">
          <h3 className="dialogo-titulo">{titulo}</h3>
          <button
            type="button"
            className="dialogo-cerrar"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="dialogo-contenido">
          {CODIGOS.map((grupo) => (
            <div key={grupo.grupo} className="grupo-codigos">
              <div className="grupo-titulo">{grupo.grupo}</div>

              <div className="grupo-lista">
                {grupo.items.map((item) => (
                  <button
                    key={item.codigo}
                    type="button"
                    className={`codigo-item ${
                      valorActual === item.codigo ? 'codigo-item-activo' : ''
                    }`}
                    onClick={() => onSelect(item.codigo)}
                  >
                    <div className="codigo-item-codigo">{item.codigo}</div>
                    <div className="codigo-item-descripcion">
                      {item.descripcion}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CodigoDialog