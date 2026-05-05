import { useEffect } from 'react'
import IconQr from './IconQr'
import IconList from './IconList'
import IconTribunal from './IconTribunal'

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
  mostraTribunal,
  onMostraTribunal,
  rit,
  onRitChange,
  año,
  onAñoChange,
  cargando,
  onGuardar,
  onEliminarUltimo,
  onAbrirLote,
  dialogoLoteAbierto,
  a1Caso,
  a1Valor1,
  a1Valor2,
  a1Casos,
  onA1CasoChange,
  onA1Valor1Change,
  onA1Valor2Change,
}) {
  useEffect(() => {
    if (escaneando) {
      const contenedor = document.querySelector('.qr-inline:not(.qr-inline-oculto)')
      if (contenedor) {
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }
    }
  }, [escaneando])

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onGuardar()
      }}
      className="formulario"
    >
      {!mostraTribunal ? (
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
            <button
              type="button"
              className="boton-icono boton-tribunal-toggle"
              onClick={onMostraTribunal}
              disabled={cargando}
              title="Modo tribunal (sin ID)"
            >
              <IconTribunal />
            </button>
          </div>
        </label>
      ) : (
        <div className="tribunal-inline">
          <label className="campo-label">
            RIT
            <input
              className="input-base"
              type="text"
              placeholder="Ej: 12-2024-00123"
              value={rit}
              onChange={(e) => onRitChange(e.target.value)}
            />
          </label>
          <label className="campo-label">
            Año
            <input
              className="input-base"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 2024"
              value={año}
              onChange={(e) => onAñoChange(parseInt(e.target.value) || '')}
            />
          </label>
          <button
            type="button"
            className="boton-icono boton-tribunal-toggle tribunal-activo"
            onClick={onMostraTribunal}
            disabled={cargando}
            title="Volver a ID notificación"
          >
            ✕
          </button>
        </div>
      )}

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

      {codigoLimpioVista === 'A1' && (
        <div className="a1-opciones-box">
          <label className="campo-label">A1 — tipo de caso</label>
          <select
            className="input-base"
            value={a1Caso}
            onChange={(e) => onA1CasoChange(e.target.value)}
          >
            <option value="">Seleccione un caso</option>
            {Object.entries(a1Casos).map(([key, caso]) => (
              <option key={key} value={key}>
                {caso.etiqueta}
              </option>
            ))}
          </select>

          {a1Caso === 'SALTO' && (
            <div className="a1-range-inline">
              <input
                className="input-base"
                placeholder="Dirección inicial"
                value={a1Valor1}
                onChange={(e) => onA1Valor1Change(e.target.value)}
              />
              <input
                className="input-base"
                placeholder="Dirección final"
                value={a1Valor2}
                onChange={(e) => onA1Valor2Change(e.target.value)}
              />
            </div>
          )}

          {a1Caso === 'INFERIOR' && (
            <div>
              <input
                className="input-base"
                placeholder="Numeración de referencia"
                value={a1Valor1}
                onChange={(e) => onA1Valor1Change(e.target.value)}
              />
            </div>
          )}

          {a1Caso === 'SUPERIOR' && (
            <div>
              <input
                className="input-base"
                placeholder="Numeración de referencia"
                value={a1Valor1}
                onChange={(e) => onA1Valor1Change(e.target.value)}
              />
            </div>
          )}

          {a1Caso === 'SIN_ORDEN' && (
            <div className="a1-ayuda-caso">
              Caso sin numeración ingresable. Se generará un comentario formal común.
            </div>
          )}
        </div>
      )}

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