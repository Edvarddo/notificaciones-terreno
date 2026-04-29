import IconQr from './IconQr'
import IconList from './IconList'

function RegistroForm({
  inputIdRef,
  idNotificacion,
  onIdChange,
  escaneando,
  onToggleEscaneo,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  zoom,
  codigo,
  onCodigoChange,
  onAbrirCodigos,
  descripcionCodigo,
  codigoLimpioVista,
  observacion,
  onObservacionChange,
  comentarios,
  onComentariosChange,
  esNoUrbana,
  onEsNoUrbanaChange,
  cargando,
  onGuardar,
  onEliminarUltimo,
  onAbrirLote,
  dialogoLoteAbierto,
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar()
      }}
      className="formulario"
    >
      <label className="campo-label">
        ID notificacion
        <div className="input-icon-row">
        <input
        ref={inputIdRef}
        className="input-base input-con-icono"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        placeholder="Ej: 18099912"
        value={idNotificacion}
        onChange={(e) =>
            onIdChange(e.target.value.replace(/\D/g, '').slice(0, 8))
        }
        />
          <button
            type="button"
            className="boton-icono"
            onClick={onToggleEscaneo}
            disabled={cargando || dialogoLoteAbierto}
            title={escaneando ? 'Cerrar escáner' : 'Escanear QR'}
            aria-label={escaneando ? 'Cerrar escáner' : 'Escanear QR'}
          >
            <IconQr />
          </button>
        </div>
      </label>

      <div className={`qr-inline ${escaneando ? '' : 'qr-inline-oculto'}`}>
        <div id="qr-reader"></div>
        {escaneando ? (
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

      <label className="campo-label">
        Codigo
        <div className="input-icon-row">
          <input
            className="input-base input-con-icono"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Ej: D2"
            value={codigo}
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

      {descripcionCodigo ? (
        <div className="codigo-descripcion-box">
          <strong>{codigoLimpioVista}:</strong> {descripcionCodigo}
        </div>
      ) : codigoLimpioVista ? (
        <div className="codigo-descripcion-box codigo-descripcion-manual">
          <strong>{codigoLimpioVista}:</strong> codigo ingresado manualmente
        </div>
      ) : null}

      <label className="campo-label">
        Observacion
        <textarea
          className="textarea-base"
          placeholder="Ej: se deja aviso"
          value={observacion}
          onChange={(e) => onObservacionChange(e.target.value)}
        />
      </label>

      <label className="campo-label">
        Comentarios (opcional)
        <textarea
          className="textarea-base"
          placeholder="Notas adicionales o detalles importantes"
          value={comentarios}
          onChange={(e) => onComentariosChange(e.target.value)}
        />
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={esNoUrbana}
          onChange={(e) => onEsNoUrbanaChange(e.target.checked)}
        />
        <span>No urbana / rural</span>
      </label>

      <div className="acciones">
        <button type="submit" className="boton-principal" disabled={cargando}>
          {cargando ? 'Guardando...' : 'Guardar'}
        </button>

        <button
          type="button"
          className="boton-secundario"
          onClick={onEliminarUltimo}
          disabled={cargando}
        >
          Eliminar ultimo
        </button>

        <button
          type="button"
          className="boton-secundario"
          onClick={onAbrirLote}
          disabled={cargando || escaneando}
        >
          Escaneo multiple
        </button>
      </div>
    </form>
  )
}

export default RegistroForm