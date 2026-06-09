import { useState } from 'react'
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
  sessionUserInitials,
}) {
  const [selectorA1Abierto, setSelectorA1Abierto] = useState(false)
  const [selectorA3Abierto, setSelectorA3Abierto] = useState(false)

  const [a1CasoDraft, setA1CasoDraft] = useState('')
  const [a1Valor1Draft, setA1Valor1Draft] = useState('')
  const [a1Valor2Draft, setA1Valor2Draft] = useState('')

  const casoDefA1 = a1Casos?.[a1Caso] || null
  const casoDefA1Draft = a1Casos?.[a1CasoDraft] || null
  const requiereA1Draft = casoDefA1Draft?.requiere ?? 0
  const casoDefA3 = a3Casos?.[a3Caso] || null

  const placeholderA1_1 =
    a1CasoDraft === 'TERMINA'
      ? 'YYYY'
      : a1CasoDraft === 'COMIENZA'
        ? 'XXXX'
        : a1CasoDraft === 'ENTRE' || a1CasoDraft === 'SALTO'
          ? 'Inicio'
          : 'Valor'

  const placeholderA1_2 =
    a1CasoDraft === 'ENTRE' || a1CasoDraft === 'SALTO'
      ? 'Final'
      : 'Valor final'

  const etiquetaValor1 =
    a1CasoDraft === 'TERMINA'
      ? 'Final'
      : a1CasoDraft === 'COMIENZA'
        ? 'Inicio'
        : a1CasoDraft === 'ENTRE' || a1CasoDraft === 'SALTO'
          ? 'Desde'
          : 'Valor'

  const etiquetaValor2 =
    a1CasoDraft === 'ENTRE' || a1CasoDraft === 'SALTO'
      ? 'Hasta'
      : 'Valor final'

  const construirObservacionDesdeCaso = (caso, valor1 = '', valor2 = '') => {
    let base = String(caso?.observacion || '').trim()

    if (!base) {
      base = String(caso?.etiqueta || '').trim()
    }

    return base
      .replaceAll('XXXX', valor1 || 'XXXX')
      .replaceAll('YYYY', valor2 || 'YYYY')
      .replaceAll('{valor1}', valor1 || '')
      .replaceAll('{valor2}', valor2 || '')
  }

  const abrirSelectorA1 = () => {
    setA1CasoDraft(a1Caso || '')
    setA1Valor1Draft(a1Valor1 || '')
    setA1Valor2Draft(a1Valor2 || '')
    setSelectorA1Abierto(true)
  }

  const seleccionarCasoA1Draft = (key) => {
    setA1CasoDraft(key)
    setA1Valor1Draft('')
    setA1Valor2Draft('')
  }

  const aplicarCasoA1 = () => {
    const caso = a1Casos?.[a1CasoDraft]

    const valor1Final = a1CasoDraft === 'TERMINA' ? '' : a1Valor1Draft
    const valor2Final = a1CasoDraft === 'TERMINA' ? a1Valor1Draft : a1Valor2Draft

    onA1CasoChange(a1CasoDraft)
    onA1Valor1Change(valor1Final)
    onA1Valor2Change(valor2Final)

    onObservacionChange(
      construirObservacionDesdeCaso(caso, valor1Final, valor2Final)
    )

    setSelectorA1Abierto(false)
  }

  const seleccionarCasoA3 = (key) => {
    const caso = a3Casos?.[key]

    onA3CasoChange(key)
    onObservacionChange(construirObservacionDesdeCaso(caso))

    setSelectorA3Abierto(false)
  }

  const obtenerTextoResumenA1 = () => {
    if (!casoDefA1) return 'Seleccionar caso A1'

    const valorPrincipal = a1Caso === 'TERMINA'
      ? a1Valor2
      : a1Valor1

    if (!valorPrincipal && !a1Valor2) {
      return casoDefA1.etiqueta
    }

    if (a1Valor1 && a1Valor2) {
      return `${casoDefA1.etiqueta}: ${a1Valor1} - ${a1Valor2}`
    }

    return `${casoDefA1.etiqueta}: ${valorPrincipal || a1Valor2}`
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (cargando || cargaFinalizada) return
        onGuardar()
      }}
      className="formulario"
    >
      {sessionUserInitials ? (
        <div className="usuario-activo-chip">
          <span className="usuario-activo-avatar">
            {sessionUserInitials.slice(0, 2)}
          </span>
          <span>
            Notificador <strong>{sessionUserInitials}</strong>
          </span>
        </div>
      ) : null}

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
              onChange={(e) =>
                onIdChange(e.target.value.replace(/\D/g, '').slice(0, 9))
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
              inputMode="numeric"
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

      {codigoLimpioVista === 'A1' ? (
        <div className="a1-opciones-box">
          <div className="a1-selector-compacto">
            <label className="campo-label">Detalle A1</label>

            <button
              type="button"
              className="selector-card"
              onClick={abrirSelectorA1}
            >
              <span>{obtenerTextoResumenA1()}</span>
              <span className="selector-card-flecha">›</span>
            </button>
          </div>

          {selectorA1Abierto ? (
            <div
              className="selector-sheet-overlay"
              onClick={() => setSelectorA1Abierto(false)}
            >
              <div
                className="selector-sheet"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="selector-sheet-header">
                  <div>
                    <span className="selector-sheet-kicker">Detalle A1</span>
                    <h3>Seleccione un caso</h3>
                  </div>

                  <button
                    type="button"
                    className="selector-sheet-cerrar"
                    onClick={() => setSelectorA1Abierto(false)}
                  >
                    Cerrar
                  </button>
                </div>

                <div className="selector-sheet-lista">
                  {Object.entries(a1Casos).map(([key, caso]) => (
                    <button
                      key={key}
                      type="button"
                      className={`selector-sheet-item ${a1CasoDraft === key ? 'selector-sheet-item-activo' : ''
                        }`}
                      onClick={() => seleccionarCasoA1Draft(key)}
                    >
                      <span>{caso.etiqueta}</span>
                      {a1CasoDraft === key ? (
                        <span className="selector-sheet-check">✓</span>
                      ) : null}
                    </button>
                  ))}
                </div>

                {a1CasoDraft && requiereA1Draft > 0 ? (
                  <div
                    className={`a1-modal-valores ${requiereA1Draft === 1 ? 'a1-un-valor' : ''
                      }`}
                  >
                    {requiereA1Draft >= 1 ? (
                      <label className="a1-mini-campo">
                        <span>{etiquetaValor1}</span>
                        <input
                          inputMode="numeric"
                          pattern="[0-9]*"
                          className="input-base"
                          placeholder={placeholderA1_1}
                          value={a1Valor1Draft}
                          onChange={(e) => setA1Valor1Draft(e.target.value)}
                        />
                      </label>
                    ) : null}

                    {requiereA1Draft === 2 ? (
                      <label className="a1-mini-campo">
                        <span>{etiquetaValor2}</span>
                        <input
                          className="input-base"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder={placeholderA1_2}
                          value={a1Valor2Draft}
                          onChange={(e) => setA1Valor2Draft(e.target.value)}
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="boton-principal"
                  onClick={aplicarCasoA1}
                  disabled={!a1CasoDraft}
                >
                  Aplicar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {codigoLimpioVista === 'A3' ? (
        <div className="a3-opciones-box">
          <label className="campo-label">Detalle A3</label>

          <button
            type="button"
            className="selector-card"
            onClick={() => setSelectorA3Abierto(true)}
          >
            <span>{casoDefA3?.etiqueta || 'Seleccionar caso A3'}</span>
            <span className="selector-card-flecha">›</span>
          </button>

          {selectorA3Abierto ? (
            <div
              className="selector-sheet-overlay"
              onClick={() => setSelectorA3Abierto(false)}
            >
              <div
                className="selector-sheet"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="selector-sheet-header">
                  <div>
                    <span className="selector-sheet-kicker">Detalle A3</span>
                    <h3>Seleccione un caso</h3>
                  </div>

                  <button
                    type="button"
                    className="selector-sheet-cerrar"
                    onClick={() => setSelectorA3Abierto(false)}
                  >
                    Cerrar
                  </button>
                </div>

                <div className="selector-sheet-lista">
                  {Object.entries(a3Casos).map(([key, caso]) => (
                    <button
                      key={key}
                      type="button"
                      className={`selector-sheet-item ${a3Caso === key ? 'selector-sheet-item-activo' : ''
                        }`}
                      onClick={() => seleccionarCasoA3(key)}
                    >
                      <span>{caso.etiqueta}</span>
                      {a3Caso === key ? (
                        <span className="selector-sheet-check">✓</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
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

      {/* <label className="campo-label">
        Comentarios (opcional)
        <textarea
          className="textarea-base"
          placeholder="Notas adicionales o detalles importantes"
          value={comentarios}
          onChange={(e) => onComentariosChange(e.target.value)}
        />
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