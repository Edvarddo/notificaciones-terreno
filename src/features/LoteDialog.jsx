import IdHighlight from '../components/IdHighlight'
import IconList from '../components/IconList'

function LoteDialog({
  abierto,
  onClose,
  escaneandoLote,
  onToggleEscaneo,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  zoom,
  guardandoLote,
  onLimpiarLote,
  idsTemporales,
  onQuitarId,
  horaLote,
  onHoraChange,
  codigoLote,
  onCodigoChange,
  onAbrirCodigos,
  codigoLoteVista,
  descripcionCodigoLote,
  observacionLote,
  onObservacionChange,
  esNoUrbanaLote,
  onEsNoUrbanaLoteChange,
  mostraTribunalLote,
  onMostraTribunalLote,
  ritLote,
  onRitLoteChange,
  añoLote,
  onAñoLoteChange,
  onGuardarLote,
  ultimoIdAgregadoLote,
}) {
  if (!abierto) return null

  return (
    <div className="dialogo-overlay" onClick={onClose}>
      <div className="dialogo-codigos dialogo-lote" onClick={(e) => e.stopPropagation()}>
        <div className="dialogo-header">
          <h3 className="dialogo-titulo">Escaneo multiple</h3>
          <button
            type="button"
            className="dialogo-cerrar"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>

        <div className="dialogo-contenido">
          {ultimoIdAgregadoLote ? (
            <div className="mensaje-agregado-lote">
              ID agregado: <strong>{ultimoIdAgregadoLote}</strong>
            </div>
          ) : null}

          <div className="acciones-lote-dialogo">
            <button
              type="button"
              className="boton-secundario"
              onClick={onToggleEscaneo}
              disabled={guardandoLote}
            >
              {escaneandoLote ? 'Cerrar escaneo' : 'Abrir escaneo'}
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={onLimpiarLote}
              disabled={guardandoLote}
            >
              Limpiar lote
            </button>

            <button
              type="button"
              className={`boton-icono boton-tribunal-toggle ${mostraTribunalLote ? 'tribunal-activo' : ''}`}
              onClick={onMostraTribunalLote}
              disabled={guardandoLote}
              title="Tribunal en lote"
              aria-label="Tribunal en lote"
            >
              ⚖
            </button>
          </div>

          <div className={`qr-inline qr-inline-lote ${escaneandoLote ? '' : 'qr-inline-oculto'}`}>
            <div id="qr-reader-lote"></div>
            {escaneandoLote ? (
              <div className="qr-zoom-bar">
                <button type="button" className="boton-mini" onClick={onZoomOut} aria-label="Alejar cámara">
                  -
                </button>
                <span className="qr-zoom-valor">Zoom {Math.round((zoom || 1) * 100)}%</span>
                <button type="button" className="boton-mini" onClick={onZoomIn} aria-label="Acercar cámara">
                  +
                </button>
                <button type="button" className="boton-mini" onClick={onResetZoom} aria-label="Restablecer zoom">
                  Reset
                </button>
              </div>
            ) : null}
          </div>

          <div className="lote-formulario">
            <label className="campo-label">
              Hora del lote
              <input
                className="input-base"
                type="text"
                inputMode="numeric"
                placeholder="Ej: 1435"
                value={horaLote}
                onChange={onHoraChange}
              />
            </label>

            {mostraTribunalLote && (
              <div className="tribunal-inline">
                <label className="campo-label">
                  RIT
                  <input
                    className="input-base"
                    type="text"
                    placeholder="Ej: 12-2024-00123"
                    value={ritLote}
                    onChange={(e) => onRitLoteChange(e.target.value)}
                  />
                </label>

                <label className="campo-label">
                  Año
                  <input
                    className="input-base"
                    type="number"
                    inputMode="numeric"
                    placeholder="Ej: 2024"
                    value={añoLote}
                    onChange={(e) => onAñoLoteChange(parseInt(e.target.value) || '')}
                  />
                </label>
              </div>
            )}

            <label className="campo-label">
              Codigo del lote
              <div className="input-icon-row">
                <input
                  className="input-base input-con-icono"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Ej: D2"
                  value={codigoLote}
                  onChange={onCodigoChange}
                />
                <button
                  type="button"
                  className="boton-icono"
                  onClick={onAbrirCodigos}
                  title="Codigos frecuentes"
                  aria-label="Codigos frecuentes"
                >
                  <IconList />
                </button>
              </div>
            </label>

            {descripcionCodigoLote ? (
              <div className="codigo-descripcion-box">
                <strong>{codigoLoteVista}:</strong> {descripcionCodigoLote}
              </div>
            ) : codigoLoteVista ? (
              <div className="codigo-descripcion-box codigo-descripcion-manual">
                <strong>{codigoLoteVista}:</strong> codigo ingresado manualmente
              </div>
            ) : null}

            <label className="campo-label">
              Observacion del lote
              <textarea
                className="textarea-base"
                placeholder="Ej: se deja aviso"
                value={observacionLote}
                onChange={(e) => onObservacionChange(e.target.value)}
              />
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={esNoUrbanaLote}
                onChange={(e) => onEsNoUrbanaLoteChange(e.target.checked)}
              />
              <span>No urbana / rural</span>
            </label>

            <div className="tabla-wrapper tabla-wrapper-lote">
              <table className="tabla-registros">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ID NOTIFICACION</th>
                    <th>ACCION</th>
                  </tr>
                </thead>
                <tbody>
                  {idsTemporales.length === 0 ? (
                    <tr>
                      <td colSpan="3">No hay IDs cargados en el lote.</td>
                    </tr>
                  ) : (
                    idsTemporales.map((id, index) => (
                      <tr key={id}>
                        <td>{index + 1}</td>
                        <td><IdHighlight value={id} /></td>
                        <td>
                          <button
                            type="button"
                            className="boton-quitar-fila"
                            onClick={() => onQuitarId(id)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="acciones">
              <button
                type="button"
                className="boton-principal"
                onClick={onGuardarLote}
                disabled={guardandoLote}
              >
                {guardandoLote ? 'Guardando lote...' : 'Guardar lote'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoteDialog