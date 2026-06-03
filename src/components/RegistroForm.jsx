import IconQr from './IconQr'
import IconList from './IconList'
import IconTribunal from './IconTribunal'

function RegistroForm({
  inputIdRef,
  idNotificacion,
  onIdChange,
  escaneando,
  onToggleEscaneo,
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
  cargaFinalizada,
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
  a3Caso,
  a3Casos,
  onA3CasoChange,
}) {
  const casoDefA1 = a1Casos?.[a1Caso] || null
  const requiereA1 = casoDefA1?.requiere ?? 0
  const placeholderA1_1 = a1Caso === 'TERMINA' ? 'YYYY (final)' : (a1Caso === 'COMIENZA' ? 'XXXX (inicio)' : (a1Caso === 'ENTRE' || a1Caso === 'SALTO' ? 'Dirección inicial (XXXX)' : 'Valor'))
  const placeholderA1_2 = a1Caso === 'ENTRE' || a1Caso === 'SALTO' ? 'Dirección final (YYYY)' : 'Valor final'
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()

        if (cargando || cargaFinalizada) return

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
              maxLength={9}
              placeholder="Ej: 18099912"
              value={idNotificacion}
              onChange={(e) => onIdChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
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
              inputMode='numeric'
              placeholder="Ej: 2490"
              value={rit}
              maxLength={5}
              onChange={(e) => onRitChange(e.target.value)}
            />
          </label>
          <label className="campo-label">
            AÑO
            <input
              className="input-base"
              type="text"
              inputMode="numeric"
              placeholder="Ej: 2024"
              value={año}
              maxLength={4}
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
          <select className="input-base" value={a1Caso} onChange={(e) => onA1CasoChange(e.target.value)}>
            <option value="">Seleccione un caso</option>
            {Object.entries(a1Casos).map(([key, caso]) => (
              <option key={key} value={key}>
                {caso.etiqueta}
              </option>
            ))}
          </select>

          {a1Caso && (
            requiereA1 === 0 ? (
              <div className="a1-ayuda-caso">{casoDefA1?.etiqueta}</div>
            ) : (
              <div className={requiereA1 === 2 ? 'a1-range-inline' : ''}>
                {requiereA1 >= 1 && (
                  <input
                    className="input-base"
                    placeholder={placeholderA1_1}
                    value={a1Valor1}
                    onChange={(e) => onA1Valor1Change(e.target.value)}
                  />
                )}

                {requiereA1 === 2 && (
                  <input
                    className="input-base"
                    placeholder={placeholderA1_2}
                    value={a1Valor2}
                    onChange={(e) => onA1Valor2Change(e.target.value)}
                  />
                )}
              </div>
            )
          )}
        </div>
      )}

      {codigoLimpioVista === 'A3' && (
        <div className="a3-opciones-box">
          <label className="campo-label">A3 — tipo de falta</label>
          <select className="input-base" value={a3Caso} onChange={(e) => onA3CasoChange(e.target.value)}>
            <option value="">Seleccione un caso</option>
            {Object.entries(a3Casos).map(([key, caso]) => (
              <option key={key} value={key}>
                {caso.etiqueta}
              </option>
            ))}
          </select>
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

      {/* <label className="check-row">
        <input type="checkbox" checked={esNoUrbana} onChange={(e) => onEsNoUrbanaChange(e.target.checked)} />
        <span>No urbana / rural</span>
      </label> */}






      <div className="acciones acciones-secundarias">
        <button
          type="submit"
          className={`boton-principal ${cargando ? 'boton-guardando' : ''}`}
          disabled={cargando || cargaFinalizada}
        >
          {cargaFinalizada ? (
            'Cerrando carga...'
          ) : cargando ? (
            <>
              <span className="spinner-guardar" />
              Guardando...
            </>
          ) : (
            'Guardar'
          )}
        </button>

        <button
          type="button"
          className="boton-secundario"
          onClick={onAbrirLote}
          disabled={cargando || escaneando || cargaFinalizada}
        >
          Escaneo multiple
        </button>
      </div>

      <div className="acciones acciones-criticas">
        <button
          type="button"
          className="boton-peligro boton-critico"
          onClick={onEliminarUltimo}
          disabled={cargando || cargaFinalizada}
        >
          Eliminar ultimo
        </button>
      </div>

      {cargaFinalizada ? (
        <div className="carga-finalizada-banner">
          Se está cerrando esta carga. Espera un momento para continuar.
        </div>
      ) : null}
    </form>
  )
}

export default RegistroForm
