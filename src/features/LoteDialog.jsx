import { useEffect, useMemo, useState } from 'react'
import IdHighlight from '../components/IdHighlight'
import IconList from '../components/IconList'
import CodigoDialog from './CodigoDialog'

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
  const [codigoDialogAbierto, setCodigoDialogAbierto] = useState(false)
  const [codigoDialogFila, setCodigoDialogFila] = useState(null)
  const [horaManual, setHoraManual] = useState(false)
  const [confirmarLimpiarAbierto, setConfirmarLimpiarAbierto] = useState(false)
  const obtenerHoraActualHHMM = () => {
    const ahora = new Date()
    const hh = String(ahora.getHours()).padStart(2, '0')
    const mm = String(ahora.getMinutes()).padStart(2, '0')
    return `${hh}${mm}`
  }
  useEffect(() => {
    if (abierto && escaneandoLote) {
      const contenedor = document.querySelector('.qr-inline-lote:not(.qr-inline-oculto)')
      if (contenedor) {
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }
    }
  }, [abierto, escaneandoLote])

  useEffect(() => {
    if (!abierto || horaManual || guardandoLote || cargaFinalizada) return

    const obtenerHoraActualHHMM = () => {
      const ahora = new Date()
      return `${String(ahora.getHours()).padStart(2, '0')}${String(ahora.getMinutes()).padStart(2, '0')}`
    }

    const actualizarHora = () => {
      onHoraChange(obtenerHoraActualHHMM())
    }

    actualizarHora()

    const intervalo = setInterval(actualizarHora, 30000)

    return () => clearInterval(intervalo)
  }, [abierto, horaManual, guardandoLote, cargaFinalizada])

  const filasLote = useMemo(() => {
    const filasQr = (idsTemporales || []).map((id, index) => ({
      tipo: 'QR',
      key: `qr-${id}-${index}`,
      id,
      label: id,
      indexOriginal: index,
      tribunal: null,
    }))

    const filasTribunal = (tribunalesLote || [])
      .map((tribunal, index) => ({
        tipo: 'TRIBUNAL',
        key: `tribunal-${index}`,
        id: `TRIBUNAL-${index + 1}`,
        label: `${tribunal.rit || '-'} / ${tribunal.año || '-'}`,
        indexOriginal: index,
        tribunal,
      }))
      .filter((fila) => fila.tribunal?.rit || fila.tribunal?.año)

    return [...filasQr, ...filasTribunal]
  }, [idsTemporales, tribunalesLote])

  if (!abierto) return null

  const normalizarCodigo = (valor) => (valor || '').toString().trim().toUpperCase()

  const obtenerCodigoFila = (fila) => {
    if (fila.tipo === 'TRIBUNAL') {
      return normalizarCodigo(fila.tribunal?.codigo || codigoLote)
    }

    return normalizarCodigo((codigoPorId && codigoPorId[fila.id]) || codigoLote)
  }

  const obtenerObservacionFila = (fila) => {
    if (fila.tipo === 'TRIBUNAL') {
      return fila.tribunal?.observacion || observacionLote || ''
    }

    return (observacionPorId && observacionPorId[fila.id]) || observacionLote || ''
  }

  const abrirCodigoParaFila = (fila) => {
    setCodigoDialogFila(fila)
    setCodigoDialogAbierto(true)
  }

  const cerrarCodigoDialog = () => {
    setCodigoDialogAbierto(false)
    setCodigoDialogFila(null)
  }

  const manejarSeleccionCodigo = (codigoSeleccionado) => {
    if (!codigoDialogFila) {
      cerrarCodigoDialog()
      return
    }

    if (codigoDialogFila.tipo === 'TRIBUNAL') {
      onActualizarTribunalLote(codigoDialogFila.indexOriginal, 'codigo', codigoSeleccionado)
    } else if (onSetCodigoParaId) {
      onSetCodigoParaId(codigoDialogFila.id, codigoSeleccionado)
    }

    cerrarCodigoDialog()
  }

  const editarObservacionParaFila = (fila) => {
    const actual = obtenerObservacionFila(fila)
    const titulo = fila.tipo === 'TRIBUNAL' ? `Observacion para ${fila.label}` : `Observacion para ${fila.id}`
    const nuevo = window.prompt(titulo, actual)

    if (nuevo === null) return

    if (fila.tipo === 'TRIBUNAL') {
      onActualizarTribunalLote(fila.indexOriginal, 'observacion', nuevo)
    } else if (onSetObservacionParaId) {
      onSetObservacionParaId(fila.id, nuevo)
    }
  }

  const quitarFila = (fila) => {
    if (fila.tipo === 'TRIBUNAL') {
      onQuitarTribunalLote(fila.indexOriginal)
      return
    }

    onQuitarId(fila.indexOriginal)
  }

  const casoDefA1 = a1Casos?.[a1Caso] || null
  const requiereA1 = casoDefA1?.requiere ?? 0

  const placeholderA1_1 =
    a1Caso === 'TERMINA'
      ? 'YYYY (final)'
      : a1Caso === 'COMIENZA'
        ? 'XXXX (inicio)'
        : a1Caso === 'ENTRE' || a1Caso === 'SALTO'
          ? 'Direccion inicial (XXXX)'
          : 'Valor'

  const placeholderA1_2 =
    a1Caso === 'ENTRE' || a1Caso === 'SALTO'
      ? 'Direccion final (YYYY)'
      : 'Valor final'

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
              {cargaFinalizada
                ? 'Cerrando carga...'
                : escaneandoLote
                  ? 'Cerrar escaneo'
                  : 'Abrir escaneo'}
            </button>

            <button
              type="button"
              className="boton-secundario"
              onClick={() => setConfirmarLimpiarAbierto(true)}
              disabled={guardandoLote || cargaFinalizada}
            >
              {cargaFinalizada ? 'Cerrando carga...' : 'Limpiar lote'}
            </button>

            <button
              type="button"
              className={`boton-secundario boton-tribunal-toggle ${mostraTribunalLote ? 'tribunal-activo' : ''}`}
              onClick={onMostraTribunalLote}
              disabled={guardandoLote || cargaFinalizada}
              title="Tribunal en lote"
              aria-label="Tribunal en lote"
            >
              Tribunal
            </button>
          </div>

          <div className={`qr-inline qr-inline-lote ${escaneandoLote ? '' : 'qr-inline-oculto'}`}>
            <div id="qr-reader-lote"></div>

            {escaneandoLote ? (
              <div className="qr-zoom-bar">
                <button type="button" className="boton-mini" onClick={onZoomOut} aria-label="Alejar camara">
                  -
                </button>

                <span className="qr-zoom-valor">Zoom {Math.round((zoom || 1) * 100)}%</span>

                <button type="button" className="boton-mini" onClick={onZoomIn} aria-label="Acercar camara">
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
                maxLength={4}
                placeholder="Ej: 1435"
                value={horaLote || ''}
                onChange={(e) => {
                  const valor = e?.target?.value ?? ''
                  setHoraManual(true)
                  onHoraChange(valor.replace(/\D/g, '').slice(0, 4))
                }}
              />
            </label>

            {mostraTribunalLote && (
              <div className="tribunal-item-lote">
                <div className="tribunal-item-cabecera">
                  <span className="tribunal-item-titulo">Casos sin QR</span>

                  <div className="tribunal-item-acciones">
                    <button
                      type="button"
                      className="boton-mini"
                      onClick={onAgregarTribunalLote}
                      disabled={guardandoLote || cargaFinalizada}
                    >
                      + caso
                    </button>

                    <button
                      type="button"
                      className="boton-mini"
                      onClick={onCopiarUltimoTribunalLote}
                      disabled={guardandoLote || cargaFinalizada}
                    >
                      Copiar ultimo
                    </button>
                  </div>
                </div>

                <div className="tribunal-lista-lote">
                  {(tribunalesLote || []).map((tribunal, index) => (
                    <div className="tribunal-inline" key={`tribunal-edit-${index}`}>
                      <label className="campo-label">
                        RIT
                        <input
                          className="input-base"
                          type="text"
                          placeholder="Ej: 12-2024-00123"
                          value={tribunal.rit || ''}
                          maxLength={5}
                          max={5}
                          inputMode='numeric'
                          onChange={(e) => onActualizarTribunalLote(index, 'rit', e.target.value)}
                        />
                      </label>

                      <label className="campo-label">
                        Año
                        <input
                          className="input-base"
                          type="text"
                          inputMode="numeric"
                          placeholder="Ej: 2024"
                          value={tribunal.año || ''}
                          maxLength={4}
                          max={4}
                          onChange={(e) => onActualizarTribunalLote(index, 'año', e.target.value)}
                        />
                      </label>

                      <button
                        type="button"
                        className="boton-mini"
                        onClick={() => onQuitarTribunalLote(index)}
                        disabled={guardandoLote || cargaFinalizada || tribunalesLote.length === 1}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="campo-label">
              Codigo general del lote
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
                  disabled={cargaFinalizada}
                >
                  <IconList />
                </button>
              </div>
            </label>

            {codigoLoteVista === 'A3' && (
              <div className="a3-opciones-box">
                <label className="campo-label">A3 — tipo de falta</label>

                <select
                  className="input-base"
                  value={a3Caso}
                  onChange={(e) => onA3CasoChange(e.target.value)}
                >
                  <option value="">Seleccione un caso</option>

                  {Object.entries(a3Casos || {}).map(([key, caso]) => (
                    <option key={key} value={key}>
                      {caso.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {codigoLoteVista === 'A1' && (
              <div className="a1-opciones-box">
                <label className="campo-label">A1 — tipo de caso</label>

                <select
                  className="input-base"
                  value={a1Caso}
                  onChange={(e) => onA1CasoChange(e.target.value)}
                >
                  <option value="">Seleccione un caso</option>

                  {Object.entries(a1Casos || {}).map(([key, caso]) => (
                    <option key={key} value={key}>
                      {caso.etiqueta}
                    </option>
                  ))}
                </select>

                {a1Caso && (
                  requiereA1 === 0 ? (
                    <div className="a1-ayuda-caso">
                      {casoDefA1?.etiqueta}
                    </div>
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
              Observacion general del lote
              <textarea
                className="textarea-base"
                placeholder="Ej: se deja aviso"
                value={observacionLote}
                onChange={(e) => onObservacionChange(e.target.value)}
              />
            </label>

            {/* <label className="check-row">
              <input
                type="checkbox"
                checked={esNoUrbanaLote}
                onChange={(e) => onEsNoUrbanaLoteChange(e.target.checked)}
              />
              <span>No urbana / rural</span>
            </label> */}

            <div className="tabla-wrapper tabla-wrapper-lote">
              <table className="tabla-registros">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ORIGEN</th>
                    <th>CASO / ID</th>
                    <th>CODIGO</th>
                    <th>OBSERVACION</th>
                    <th>SUGERENCIAS</th>
                    <th>ACCION</th>
                  </tr>
                </thead>

                <tbody>
                  {filasLote.length === 0 ? (
                    <tr>
                      <td colSpan="7">No hay casos cargados en el lote.</td>
                    </tr>
                  ) : (
                    filasLote.map((fila, index) => {
                      const codigoEfectivo = obtenerCodigoFila(fila)
                      const observacionEfectiva = obtenerObservacionFila(fila)

                      let sugerencia = ''

                      try {
                        sugerencia = obtenerObservacionSugerida
                          ? obtenerObservacionSugerida(codigoEfectivo)
                          : ''

                        if (Array.isArray(sugerencia)) {
                          sugerencia = sugerencia[0] || ''
                        }
                      } catch (e) {
                        sugerencia = ''
                      }

                      return (
                        <tr key={fila.key}>
                          <td>{index + 1}</td>

                          <td>{fila.tipo === 'TRIBUNAL' ? 'Tribunal' : 'QR'}</td>

                          <td>
                            {fila.tipo === 'QR' ? (
                              <IdHighlight value={fila.label} />
                            ) : (
                              <strong>{fila.label}</strong>
                            )}
                          </td>

                          <td>{codigoEfectivo || '-'}</td>

                          <td>{observacionEfectiva || '-'}</td>

                          <td>{sugerencia || '-'}</td>

                          <td>
                            <button
                              type="button"
                              className="boton-secundario"
                              onClick={() => abrirCodigoParaFila(fila)}
                              title="Cambiar codigo"
                              disabled={guardandoLote || cargaFinalizada}
                            >
                              Cambiar codigo
                            </button>

                            <button
                              type="button"
                              className="boton-secundario"
                              onClick={() => editarObservacionParaFila(fila)}
                              title="Editar observacion"
                              disabled={guardandoLote || cargaFinalizada}
                            >
                              Editar observacion
                            </button>

                            <button
                              type="button"
                              className="boton-quitar-fila"
                              onClick={() => quitarFila(fila)}
                              disabled={guardandoLote || cargaFinalizada}
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            {confirmarLimpiarAbierto && (
              <div className="confirmacion-overlay" onClick={() => setConfirmarLimpiarAbierto(false)}>
                <div className="confirmacion-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>Limpiar lote</h3>

                  <p>
                    Se eliminarán los IDs QR y casos de tribunal cargados temporalmente.
                  </p>

                  <div className="confirmacion-acciones">
                    <button
                      type="button"
                      className="boton-secundario"
                      onClick={() => setConfirmarLimpiarAbierto(false)}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="boton-peligro"
                      onClick={() => {
                        onLimpiarLote()
                        setConfirmarLimpiarAbierto(false)
                      }}
                    >
                      Sí, limpiar lote
                    </button>
                  </div>
                </div>
              </div>
            )}

            <CodigoDialog
              abierto={codigoDialogAbierto}
              titulo={codigoDialogFila ? `Codigo para ${codigoDialogFila.label}` : 'Codigos'}
              valorActual={codigoDialogFila ? obtenerCodigoFila(codigoDialogFila) : codigoLote}
              onClose={cerrarCodigoDialog}
              onSelect={manejarSeleccionCodigo}
            />

            <div className="acciones">
              <button
                type="button"
                className="boton-principal"
                onClick={onGuardarLote}
                disabled={guardandoLote || cargaFinalizada}
              >
                {cargaFinalizada
                  ? 'Cerrando carga...'
                  : guardandoLote
                    ? 'Guardando lote...'
                    : 'Guardar lote'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoteDialog
