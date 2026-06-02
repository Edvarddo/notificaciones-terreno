import { useState } from 'react'
import IdHighlight from '../components/IdHighlight'
import IconList from '../components/IconList'
import CodigoDialog from './CodigoDialog'

function LoteDialog({
  abierto,
  onClose,
  escaneandoLote,
  onToggleEscaneo,
  guardandoLote,
  cargaFinalizada,
  onLimpiarLote,
  idsTemporales,
  onQuitarId,
  horaLote,
  onHoraChange,
  codigoLote,
  onCodigoChange,
  onAbrirCodigos,
  codigoPorId,
  onSetCodigoParaId,
  observacionPorId,
  onSetObservacionParaId,
  obtenerObservacionSugerida,
  codigoLoteVista,
  descripcionCodigoLote,
  observacionLote,
  onObservacionChange,
  esNoUrbanaLote,
  onEsNoUrbanaLoteChange,
  mostraTribunalLote,
  onMostraTribunalLote,
  tribunalesLote,
  onAgregarTribunalLote,
  onQuitarTribunalLote,
  onActualizarTribunalLote,
  onGuardarLote,
  ultimoIdAgregadoLote,
  onCopiarUltimoTribunalLote,
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
  if (!abierto) return null

  const [codigoDialogAbierto, setCodigoDialogAbierto] = useState(false)
  const [codigoDialogId, setCodigoDialogId] = useState(null)

  const abrirCodigoParaId = (id) => {
    setCodigoDialogId(id)
    setCodigoDialogAbierto(true)
  }

  const cerrarCodigoDialog = () => {
    setCodigoDialogAbierto(false)
    setCodigoDialogId(null)
  }

  const manejarSeleccionCodigo = (codigoSeleccionado) => {
    if (codigoDialogId && onSetCodigoParaId) {
      onSetCodigoParaId(codigoDialogId, codigoSeleccionado)
    }
    cerrarCodigoDialog()
  }

  const editarObservacionParaId = (id) => {
    const actual = (observacionPorId && observacionPorId[id]) || observacionLote || ''
    const nuevo = window.prompt(`Observación para ${id}`, actual)
    if (nuevo !== null && onSetObservacionParaId) {
      onSetObservacionParaId(id, nuevo)
    }
  }

  const casoDefA1 = a1Casos?.[a1Caso] || null
  const requiereA1 = casoDefA1?.requiere ?? 0
  const placeholderA1_1 = a1Caso === 'TERMINA' ? 'YYYY (final)' : (a1Caso === 'COMIENZA' ? 'XXXX (inicio)' : (a1Caso === 'ENTRE' || a1Caso === 'SALTO' ? 'Dirección inicial (XXXX)' : 'Valor'))
  const placeholderA1_2 = a1Caso === 'ENTRE' || a1Caso === 'SALTO' ? 'Dirección final (YYYY)' : 'Valor final'

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
              disabled={guardandoLote || cargaFinalizada}
            >
              {cargaFinalizada ? 'Cerrando carga...' : escaneandoLote ? 'Cerrar escaneo' : 'Abrir escaneo'}
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={onLimpiarLote}
              disabled={guardandoLote || cargaFinalizada}
            >
              {cargaFinalizada ? 'Cerrando carga...' : 'Limpiar lote'}
            </button>

            <button
              type="button"
              className={`boton-icono boton-tribunal-toggle ${mostraTribunalLote ? 'tribunal-activo' : ''}`}
              onClick={onMostraTribunalLote}
              disabled={guardandoLote || cargaFinalizada}
              title="Tribunal en lote"
              aria-label="Tribunal en lote"
            >
              ⚖
            </button>
          </div>

          <div className="scanner-lote-resumen">
            {escaneandoLote ? 'El escáner de lote se abrirá en un modal separado.' : 'Abre el escáner para agregar varios IDs.'}
          </div>

          <div className="lote-campos-extra">
            <label className="campo-label">
              Hora del lote
              <input
                className="input-base"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="Ej: 1430"
                value={horaLote}
                onChange={(e) => onHoraChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </label>

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
                  title="Codigos frecuentes del lote"
                  aria-label="Codigos frecuentes del lote"
                >
                  <IconList />
                </button>
              </div>
            </label>

            {codigoLote === 'A3' && (
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

            {codigoLote === 'A1' && (
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
                        <input className="input-base" placeholder={placeholderA1_1} value={a1Valor1} onChange={(e) => onA1Valor1Change(e.target.value)} />
                      )}
                      {requiereA1 === 2 && (
                        <input className="input-base" placeholder={placeholderA1_2} value={a1Valor2} onChange={(e) => onA1Valor2Change(e.target.value)} />
                      )}
                    </div>
                  )
                )}
              </div>
            )}

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
                placeholder="Observación general para el lote"
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
          </div>

          <div className="tribunal-lote-box">
            <label className="check-row">
              <input
                type="checkbox"
                checked={mostraTribunalLote}
                onChange={onMostraTribunalLote}
              />
              <span>Agregar tribunales al lote</span>
            </label>

            {mostraTribunalLote ? (
              <div className="tribunales-lote-lista">
                {tribunalesLote.map((tribunal, index) => (
                  <div key={`${tribunal.id || index}`} className="tribunal-lote-item">
                    <input
                      className="input-base"
                      placeholder="RIT"
                      value={tribunal.rit || ''}
                      onChange={(e) => onActualizarTribunalLote(index, 'rit', e.target.value)}
                    />
                    <input
                      className="input-base"
                      placeholder="Año"
                      value={tribunal.año || ''}
                      onChange={(e) => onActualizarTribunalLote(index, 'año', e.target.value)}
                    />
                    <button
                      type="button"
                      className="boton-mini"
                      onClick={() => onQuitarTribunalLote(index)}
                      disabled={guardandoLote || cargaFinalizada}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div className="tribunales-lote-acciones">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={onAgregarTribunalLote}
                    disabled={guardandoLote || cargaFinalizada}
                  >
                    Agregar tribunal
                  </button>
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={onCopiarUltimoTribunalLote}
                    disabled={guardandoLote || cargaFinalizada}
                  >
                    Copiar ultimo
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="lote-lista-registros">
            {idsTemporales.length === 0 ? (
              <div className="lote-vacio">Aún no hay IDs en el lote.</div>
            ) : (
              idsTemporales.map((id, index) => (
                <div key={`${id}-${index}`} className="lote-registro-item">
                  <div className="lote-registro-info">
                    <IdHighlight value={id} />
                    <span className="lote-registro-hora">{horaLote || '--:--'}</span>
                  </div>
                  <div className="lote-registro-meta">
                    <button
                      type="button"
                      className="boton-mini"
                      onClick={() => onQuitarId(index)}
                      disabled={guardandoLote || cargaFinalizada}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoteDialog
