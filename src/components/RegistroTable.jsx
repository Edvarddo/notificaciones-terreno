import { useState, useEffect } from 'react'
import IdHighlight from './IdHighlight'
import CodigoDialog from '../features/CodigoDialog'
import Modal from './Modal'
import {
  CODIGOS_BUSQUEDA,
  CODIGOS_EXITOSOS,
  CODIGOS_NEGATIVOS,
} from '../constants/codigos'

function RegistroTable({
  registros,
  onRecargar,
  onActualizarRegistro,
  cargaFinalizada = false,
  cargaTotal = 0,
  puntos = 0,
  urbanas = 0,
  rurales = 0,
  obtenerObservacionSugerida,
  onEliminarRegistro,
}) {

  const [registroEditando, setRegistroEditando] = useState(null)
  const [codigoEdit, setCodigoEdit] = useState('')
  const [horaEdit, setHoraEdit] = useState('')
  const [esNoUrbanaEdit, setEsNoUrbanaEdit] = useState(false)
  const [observacionEdit, setObservacionEdit] = useState('')
  const [comentariosEdit, setComentariosEdit] = useState('')
  const [dialogoCodigoAbierto, setDialogoCodigoAbierto] = useState(false)
  const [guardadoId, setGuardadoId] = useState(null)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [codigoLoteGlobal, setCodigoLoteGlobal] = useState('')
  const [asignandoGlobal, setAsignandoGlobal] = useState(false)
  const [registroAEliminar, setRegistroAEliminar] = useState(null)
  const [motivoEliminacion, setMotivoEliminacion] = useState('')
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminacion, setErrorEliminacion] = useState('')
  const codigoLimpioView = (codigo) => String(codigo || '').trim().toUpperCase()

  const lotesAgrupados = registros.reduce((acc, registro) => {
    const lote = String(registro.codigo_lote || '').trim()

    if (!lote) return acc

    acc[lote] = (acc[lote] || 0) + 1

    return acc
  }, {})

  const obtenerClaseLote = (codigoLote) => {
    const lote = String(codigoLote || '').trim()

    if (!lote) return ''

    if ((lotesAgrupados[lote] || 0) <= 1) {
      return ''
    }

    let hash = 0

    for (const caracter of lote) {
      hash += caracter.charCodeAt(0)
    }

    return `fila-lote-${hash % 6}`
  }

  const aplicarCodigoEdit = (nuevoCodigo) => {
    const codigoNormalizado = codigoLimpioView(nuevoCodigo)

    setCodigoEdit(codigoNormalizado)

    if (codigoNormalizado === 'A1' || codigoNormalizado === 'A3') {
      return
    }

    const sugerida = obtenerObservacionSugerida?.(codigoNormalizado) || ''

    if (sugerida) {
      setObservacionEdit(sugerida)
    }
  }

  const iniciarEdicion = (registro) => {
    setRegistroEditando(registro)
    setCodigoEdit(registro.codigo || '')
    setHoraEdit(registro.hora || '')
    setEsNoUrbanaEdit(Boolean(registro.es_no_urbana))
    setObservacionEdit(registro.observacion || '')
    setComentariosEdit(registro.comentarios || '')
  }

  const cancelarEdicion = () => {
    setRegistroEditando(null)
    setCodigoEdit('')
    setHoraEdit('')
    setEsNoUrbanaEdit(false)
    setObservacionEdit('')
    setComentariosEdit('')
    setDialogoCodigoAbierto(false)
  }

  const guardarEdicion = async () => {
    if (!registroEditando?.id) return

    const ok = await onActualizarRegistro({
      id: registroEditando.id,
      codigo: codigoEdit,
      hora: horaEdit,
      es_no_urbana: esNoUrbanaEdit,
      observacion: observacionEdit,
      comentarios: comentariosEdit,
      codigo_lote: registroEditando.codigo_lote || '',
    })

    if (ok?.ok) {
      const idGuardado = registroEditando.id
      cancelarEdicion()
      setGuardadoId(idGuardado)
      setTimeout(() => setGuardadoId(null), 2000)
    }
  }

  const toggleSeleccion = (id) => {
    const nuevos = new Set(seleccionados)

    if (nuevos.has(id)) nuevos.delete(id)
    else nuevos.add(id)

    setSeleccionados(nuevos)
  }

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === registros.length) {
      setSeleccionados(new Set())
    } else {
      setSeleccionados(new Set(registros.map((r) => r.id)))
    }
  }

  const asignarLoteGlobal = async () => {
    if (!codigoLoteGlobal.trim()) {
      alert('Por favor ingresa un código de lote')
      return
    }

    if (seleccionados.size === 0) {
      alert('Por favor selecciona al menos un registro')
      return
    }

    setAsignandoGlobal(true)

    for (const id of seleccionados) {
      const registro = registros.find((r) => r.id === id)

      if (registro) {
        await onActualizarRegistro({
          id,
          codigo: registro.codigo,
          hora: registro.hora,
          es_no_urbana: registro.es_no_urbana,
          observacion: registro.observacion,
          comentarios: registro.comentarios,
          codigo_lote: codigoLoteGlobal.trim(),
        })
      }
    }

    setSeleccionados(new Set())
    setCodigoLoteGlobal('')
    setAsignandoGlobal(false)
  }

  const seleccionarCodigoEdit = (codigoSeleccionado) => {
    aplicarCodigoEdit(codigoSeleccionado)
    setDialogoCodigoAbierto(false)
  }

  const resumen = registros.reduce(
    (acc, r) => {
      const codigo = String(r.codigo ?? '').trim().toUpperCase()

      acc.total += 1

      if (CODIGOS_EXITOSOS.has(codigo)) acc.exitosas += 1
      else if (CODIGOS_BUSQUEDA.has(codigo)) acc.busqueda += 1
      else if (CODIGOS_NEGATIVOS.has(codigo)) acc.negativas += 1
      else acc.otros += 1

      return acc
    },
    {
      total: 0,
      exitosas: 0,
      busqueda: 0,
      negativas: 0,
      otros: 0,
    }
  )
  const abrirModalEliminacion = (registro) => {
    setRegistroAEliminar(registro)
    setMotivoEliminacion('')
    setErrorEliminacion('')
  }

  const cerrarModalEliminacion = () => {
    if (eliminando) return

    setRegistroAEliminar(null)
    setMotivoEliminacion('')
    setErrorEliminacion('')
  }

  const confirmarEliminacion = async () => {
    const motivoLimpio = motivoEliminacion.trim()

    if (!registroAEliminar?.id) {
      setErrorEliminacion('No se pudo identificar el registro.')
      return
    }

    if (!motivoLimpio) {
      setErrorEliminacion('Debes ingresar un motivo de eliminación.')
      return
    }

    if (typeof onEliminarRegistro !== 'function') {
      setErrorEliminacion('La función de eliminación no está disponible.')
      return
    }

    setEliminando(true)
    setErrorEliminacion('')

    try {
      const resultado = await onEliminarRegistro(
        registroAEliminar.id,
        motivoLimpio
      )

      if (!resultado?.ok) {
        setErrorEliminacion(
          resultado?.error || 'No se pudo eliminar el registro.'
        )
        return
      }

      setRegistroAEliminar(null)
      setMotivoEliminacion('')
      setErrorEliminacion('')
    } catch (error) {
      setErrorEliminacion(
        error?.message || 'Ocurrió un error al eliminar el registro.'
      )
    } finally {
      setEliminando(false)
    }
  }

  useEffect(() => {
    if (registroEditando) {
      document.body.classList.add('modal-abierto')
    } else {
      document.body.classList.remove('modal-abierto')
    }

    return () => {
      document.body.classList.remove('modal-abierto')
    }
  }, [registroEditando])

  return (
    <div className="seccion-registros">
      <div className="registros-header">
        <h2 className="titulo-seccion">Notificaciones registradas</h2>

        <div className="registros-header-acciones">
          <div className="registros-header-acciones-grupo">
            <button className="boton-mini" onClick={onRecargar} type="button">
              Recargar
            </button>
          </div>
        </div>
      </div>

      {cargaFinalizada ? (
        <div className="carga-finalizada-banner carga-finalizada-banner-tabla">
          Se está cerrando la carga actual. En breve se habilitará la siguiente.
        </div>
      ) : null}

      <div className="resumen-grid">
        <div className="resumen-card">
          <div className="resumen-label">Carga total</div>
          <div className="resumen-valor">{cargaTotal}</div>
        </div>

        <div className="resumen-card">
          <div className="resumen-label">Puntos (direcciones)</div>
          <div className="resumen-valor">{puntos}</div>
        </div>

        <div className="resumen-card">
          <div className="resumen-label">Total notificaciones hechas</div>
          <div className="resumen-valor">{resumen.total}</div>
        </div>

        <div className="resumen-card resumen-exito">
          <div className="resumen-label">Exitosas / realizadas</div>
          <div className="resumen-valor">{resumen.exitosas}</div>
        </div>

        <div className="resumen-card resumen-pendiente">
          <div className="resumen-label">Busqueda / pendientes</div>
          <div className="resumen-valor">{resumen.busqueda}</div>
        </div>

        <div className="resumen-card resumen-negativa">
          <div className="resumen-label">Negativas / concluidas</div>
          <div className="resumen-valor">{resumen.negativas}</div>
        </div>
      </div>

      <div className="resumen-secundario">
        <div className="resumen-mini">
          <span className="mini-label">Urbanas</span>
          <span className="mini-valor">{urbanas}</span>
        </div>

        <div className="resumen-mini">
          <span className="mini-label">Rurales</span>
          <span className="mini-valor">{rurales}</span>
        </div>

        {resumen.otros > 0 ? (
          <div className="resumen-mini">
            <span className="mini-label">Otros</span>
            <span className="mini-valor">{resumen.otros}</span>
          </div>
        ) : null}
      </div>

      {registros.length === 0 ? (
        <div className="card-vacia">No hay registros cargados.</div>
      ) : (
        <>
          {seleccionados.size > 0 ? (
            <div className="panel-asignar-lote">
              <div className="panel-asignar-contenido">
                <div className="panel-asignar-info">
                  <span className="panel-asignar-titulo">Asignar lote en bulk</span>
                  <span className="panel-asignar-count">
                    {seleccionados.size} registros seleccionados
                  </span>
                </div>

                <div className="panel-asignar-inputs">
                  <input
                    type="text"
                    className="input-lote-global"
                    placeholder="Ingresa el código de lote"
                    value={codigoLoteGlobal}
                    onChange={(e) => setCodigoLoteGlobal(e.target.value)}
                    disabled={asignandoGlobal}
                  />

                  <button
                    type="button"
                    className="boton-asignar-lote"
                    onClick={asignarLoteGlobal}
                    disabled={asignandoGlobal}
                  >
                    {asignandoGlobal ? 'Asignando...' : 'Asignar'}
                  </button>

                  <button
                    type="button"
                    className="boton-cancelar-seleccion"
                    onClick={() => setSeleccionados(new Set())}
                    disabled={asignandoGlobal}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="tabla-wrapper tabla-wrapper-registros">
            <table className="tabla-registros tabla-registros-compacta">
              <thead>
                <tr>
                  <th className="th-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        registros.length > 0 &&
                        seleccionados.size === registros.length
                      }
                      onChange={toggleSeleccionarTodos}
                      title="Seleccionar todos"
                    />
                  </th>

                  <th className="col-clave col-id">ID / RIT</th>
                  <th className="col-clave col-codigo">CÓDIGO</th>
                  <th className="col-clave col-hora">HORA</th>
                  <th>TIPO</th>
                  <th>LOTE</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {registros.map((r) => (
                  <tr
                    key={r.id}
                    className={`${r.es_rebajada ? 'fila-rebajada' : ''} ${r.es_no_urbana ? 'fila-rural' : ''
                      } ${obtenerClaseLote(r.codigo_lote)} ${seleccionados.has(r.id) ? 'fila-seleccionada' : ''
                      } fila-clickeable`.trim()}
                    onClick={() => iniciarEdicion(r)}
                  >
                    <td className="td-checkbox">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(r.id)}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSeleccion(r.id)}
                      />
                    </td>

                    <td className="td-id td-id-fija col-clave col-id">
                      {r.id_notificacion ? (
                        <IdHighlight value={r.id_notificacion} />
                      ) : r.rit ? (
                        <span className="tribunal-badge">
                          {r.rit}-{r.año}
                        </span>
                      ) : (
                        <span className="sin-id">--</span>
                      )}
                    </td>

                    <td className="td-codigo col-clave col-codigo">
                      <span className="codigo-badge">
                        {codigoLimpioView(r.codigo)}
                      </span>
                    </td>

                    <td className="td-hora col-clave col-hora">
                      <strong>{r.hora || '--'}</strong>
                    </td>

                    <td className="td-tipo">
                      {guardadoId === r.id ? (
                        <span className="guardado-badge">Guardado</span>
                      ) : (
                        <span className={`tipo-badge tipo-${r.es_no_urbana ? 'rural' : 'urbana'}`}>
                          {r.es_no_urbana ? 'RURAL' : 'URB'}
                        </span>
                      )}
                    </td>

                    <td className="td-lote">
                      <span className="codigo-lote-badge">
                        {r.codigo_lote || '--'}
                      </span>
                    </td>

                    <td className="td-acciones">
                      <button
                        type="button"
                        className="boton-tabla editar"
                        onClick={(e) => {
                          e.stopPropagation()
                          iniciarEdicion(r)
                        }}
                        title="Editar registro"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="boton-accion-tabla boton-eliminar-registro"
                        onClick={(event) => {
                          event.stopPropagation()
                          abrirModalEliminacion(r)
                        }}
                        title="Eliminar registro"
                        aria-label={`Eliminar registro ${r.id_notificacion || r.id}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="18"
                          height="18"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v5" />
                          <path d="M14 11v5" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {registroEditando ? (
        <Modal onClose={cancelarEdicion}>
          <div className="modal-edicion-registro">
            <div className="modal-edicion-header">
              <div>
                <h3>Editar registro</h3>
                <p>
                  {registroEditando.id_notificacion
                    ? `ID ${registroEditando.id_notificacion}`
                    : registroEditando.rit
                      ? `RIT ${registroEditando.rit}-${registroEditando.año}`
                      : 'Registro sin ID'}
                </p>
              </div>

              <button
                type="button"
                className="dialogo-cerrar"
                onClick={cancelarEdicion}
              >
                Cerrar
              </button>
            </div>

            <div className="modal-edicion-body">
              <div className="modal-edicion-grid">
                <label className="campo-label">
                  Código
                  <div className="input-icon-row">
                    <input
                      className="input-base input-con-icono"
                      type="text"
                      value={codigoEdit}
                      onChange={(e) => aplicarCodigoEdit(e.target.value)}
                      placeholder="Ej: D2"
                    />

                    <button
                      type="button"
                      className="boton-icono"
                      onClick={() => setDialogoCodigoAbierto(true)}
                      title="Seleccionar código"
                    >
                      🔍
                    </button>
                  </div>
                </label>

                <label className="campo-label">
                  Hora
                  <input
                    className="input-base"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={horaEdit}
                    placeholder="HHMM"
                    onChange={(e) =>
                      setHoraEdit(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
                    }
                  />
                </label>

                <label className="campo-label">
                  Tipo
                  <select
                    className="input-base"
                    value={esNoUrbanaEdit ? 'rural' : 'urbana'}
                    onChange={(e) => setEsNoUrbanaEdit(e.target.value === 'rural')}
                  >
                    <option value="urbana">Urbana</option>
                    <option value="rural">Rural</option>
                  </select>
                </label>

                <label className="campo-label campo-modal-full">
                  Observación
                  <textarea
                    className="textarea-base"
                    value={observacionEdit}
                    onChange={(e) => setObservacionEdit(e.target.value)}
                    placeholder="Observación"
                  />
                </label>

                <label className="campo-label campo-modal-full">
                  Comentarios
                  <textarea
                    className="textarea-base"
                    value={comentariosEdit}
                    onChange={(e) => setComentariosEdit(e.target.value)}
                    placeholder="Comentarios opcionales"
                  />
                </label>
              </div>

              <div className="modal-edicion-meta">
                <span>Geo: {registroEditando.geolocalizacion_fuente || 'manual'}</span>
                <span>Lat: {registroEditando.latitud || '--'}</span>
                <span>Lng: {registroEditando.longitud || '--'}</span>
              </div>
            </div>

            <div className="modal-edicion-acciones">
              <button
                type="button"
                className="boton-secundario"
                onClick={cancelarEdicion}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="boton-principal"
                onClick={guardarEdicion}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {registroAEliminar && (
        <div
          className="modal-eliminacion-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cerrarModalEliminacion()
            }
          }}
        >
          <div
            className="modal-eliminacion"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-eliminacion"
          >
            <div className="modal-eliminacion-icono">
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5" />
                <path d="M14 11v5" />
              </svg>
            </div>

            <div className="modal-eliminacion-contenido">
              <h2 id="titulo-modal-eliminacion">
                Eliminar registro
              </h2>

              <p className="modal-eliminacion-descripcion">
                Esta acción eliminará permanentemente el registro seleccionado.
                La operación quedará guardada en la auditoría.
              </p>

              <div className="modal-eliminacion-registro">
                <span>Registro</span>

                <strong>
                  {registroAEliminar.id_notificacion
                    ? `ID ${registroAEliminar.id_notificacion}`
                    : registroAEliminar.rit
                      ? `RIT ${registroAEliminar.rit}-${registroAEliminar.año}`
                      : `N.º ${registroAEliminar.id}`}
                </strong>
              </div>

              <label
                className="modal-eliminacion-label"
                htmlFor="motivo-eliminacion"
              >
                Motivo de eliminación
              </label>

              <textarea
                id="motivo-eliminacion"
                className="modal-eliminacion-textarea"
                value={motivoEliminacion}
                onChange={(event) => {
                  setMotivoEliminacion(event.target.value)

                  if (errorEliminacion) {
                    setErrorEliminacion('')
                  }
                }}
                placeholder="Ej.: registro duplicado, ID incorrecta o carga equivocada"
                rows={4}
                maxLength={300}
                autoFocus
                disabled={eliminando}
              />

              <div className="modal-eliminacion-contador">
                {motivoEliminacion.length}/300
              </div>

              {errorEliminacion && (
                <div className="modal-eliminacion-error" role="alert">
                  {errorEliminacion}
                </div>
              )}

              <div className="modal-eliminacion-acciones">
                <button
                  type="button"
                  className="boton-modal-cancelar"
                  onClick={cerrarModalEliminacion}
                  disabled={eliminando}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="boton-modal-eliminar"
                  onClick={confirmarEliminacion}
                  disabled={eliminando || !motivoEliminacion.trim()}
                >
                  {eliminando ? (
                    <>
                      <span className="spinner-eliminacion" />
                      Eliminando…
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        width="17"
                        height="17"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4h8v2" />
                        <path d="M19 6l-1 14H6L5 6" />
                      </svg>

                      Eliminar registro
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <CodigoDialog
        abierto={dialogoCodigoAbierto}
        titulo="Seleccionar código"
        valorActual={codigoLimpioView(codigoEdit)}
        onClose={() => setDialogoCodigoAbierto(false)}
        onSelect={seleccionarCodigoEdit}
      />
    </div>
  )
}

export default RegistroTable