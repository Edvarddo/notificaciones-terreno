import { useState } from 'react'
import IdHighlight from './IdHighlight'
import CodigoDialog from '../features/CodigoDialog'
import Modal from './Modal'

const CODIGOS_EXITOSOS = new Set(['D2', 'D4', 'E1'])
const CODIGOS_BUSQUEDA = new Set(['B3', 'B7', 'B10'])
const CODIGOS_NEGATIVOS = new Set(['A1', 'A2', 'A3', 'B5'])

function RegistroTable({
  registros,
  onRecargar,
  onActualizarRegistro,
  onDescargarCsv,
  cargaTotal = 0,
  puntos = 0,
  urbanas = 0,
  rurales = 0,
}) {
  const [editandoId, setEditandoId] = useState(null)
  const [codigoEdit, setCodigoEdit] = useState('')
  const [horaEdit, setHoraEdit] = useState('')
  const [esNoUrbanaEdit, setEsNoUrbanaEdit] = useState(false)
  const [observacionEdit, setObservacionEdit] = useState('')
  const [comentariosEdit, setComentariosEdit] = useState('')
  const [codigoLoteEdit, setCodigoLoteEdit] = useState('')
  const [dialogoCodigoAbierto, setDialogoCodigoAbierto] = useState(false)
  const [modalObservacionAbierta, setModalObservacionAbierta] = useState(false)
  const [observacionModalEdit, setObservacionModalEdit] = useState('')
  const [modalComentariosAbierta, setModalComentariosAbierta] = useState(false)
  const [comentariosModalEdit, setComentariosModalEdit] = useState('')
  const [guardadoId, setGuardadoId] = useState(null)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [codigoLoteGlobal, setCodigoLoteGlobal] = useState('')
  const [asignandoGlobal, setAsignandoGlobal] = useState(false)

  const iniciarEdicion = (registro) => {
    setEditandoId(registro.id)
    setCodigoEdit(registro.codigo || '')
    setHoraEdit(registro.hora || '')
    setEsNoUrbanaEdit(registro.es_no_urbana || false)
    setObservacionEdit(registro.observacion || '')
    setComentariosEdit(registro.comentarios || '')
    setCodigoLoteEdit(registro.codigo_lote || '')
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setCodigoEdit('')
    setHoraEdit('')
    setEsNoUrbanaEdit(false)
    setObservacionEdit('')
    setComentariosEdit('')
    setCodigoLoteEdit('')
    setDialogoCodigoAbierto(false)
    setModalObservacionAbierta(false)
    setObservacionModalEdit('')
    setModalComentariosAbierta(false)
    setComentariosModalEdit('')
  }

  const abrirModalObservacion = () => {
    setObservacionModalEdit(observacionEdit)
    setModalObservacionAbierta(true)
  }

  const guardarObservacionModal = () => {
    setObservacionEdit(observacionModalEdit)
    setModalObservacionAbierta(false)
  }

  const cancelarModalObservacion = () => {
    setModalObservacionAbierta(false)
    setObservacionModalEdit('')
  }

  const abrirModalComentarios = () => {
    setComentariosModalEdit(comentariosEdit)
    setModalComentariosAbierta(true)
  }

  const guardarComentariosModal = () => {
    setComentariosEdit(comentariosModalEdit)
    setModalComentariosAbierta(false)
  }

  const cancelarModalComentarios = () => {
    setModalComentariosAbierta(false)
    setComentariosModalEdit('')
  }

  const guardarEdicion = async (id) => {
    const ok = await onActualizarRegistro({
      id,
      codigo: codigoEdit,
      hora: horaEdit,
      es_no_urbana: esNoUrbanaEdit,
      observacion: observacionEdit,
      comentarios: comentariosEdit,
      codigo_lote: codigoLoteEdit,
    })

    if (ok?.ok) {
      // show temporary "guardado" indicator for the saved row
      cancelarEdicion()
      setGuardadoId(id)
      setTimeout(() => setGuardadoId(null), 2000)
    }
  }

  const toggleSeleccion = (id) => {
    const nuevos = new Set(seleccionados)
    if (nuevos.has(id)) {
      nuevos.delete(id)
    } else {
      nuevos.add(id)
    }
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

  const codigoLimpioView = (codigo) => String(codigo || '').trim().toUpperCase()

  const seleccionarCodigoEdit = (codigoSeleccionado) => {
    setCodigoEdit(codigoSeleccionado)
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

  return (
    <div className="seccion-registros">
      <div className="registros-header">
        <h2 className="titulo-seccion">Notificaciones registradas</h2>
        <div className="registros-header-acciones">
          <button className="boton-mini" onClick={onDescargarCsv} type="button">
            Descargar CSV
          </button>
          <button className="boton-mini" onClick={onRecargar} type="button">
            Recargar
          </button>
        </div>
      </div>

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

        {resumen.otros > 0 && (
          <div className="resumen-mini">
            <span className="mini-label">Otros</span>
            <span className="mini-valor">{resumen.otros}</span>
          </div>
        )}
      </div>

      {registros.length === 0 ? (
        <div className="card-vacia">No hay registros cargados.</div>
      ) : (
        <>
          {seleccionados.size > 0 && (
            <div className="panel-asignar-lote">
              <div className="panel-asignar-contenido">
                <div className="panel-asignar-info">
                  <span className="panel-asignar-titulo">Asignar lote en bulk</span>
                  <span className="panel-asignar-count">{seleccionados.size} registros seleccionados</span>
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
          )}
          <div className="tabla-wrapper tabla-wrapper-registros">
            <table className="tabla-registros tabla-registros-ancha">
            <thead>
              <tr>
                <th className="th-checkbox">
                  <input
                    type="checkbox"
                    checked={registros.length > 0 && seleccionados.size === registros.length}
                    onChange={toggleSeleccionarTodos}
                    title="Seleccionar todos"
                  />
                </th>
                <th>ID / RIT</th>
                <th>CÓDIGO</th>
                <th>HORA</th>
                <th>TIPO</th>
                <th>LOTE</th>
                <th>OBSERVACIÓN</th>
                <th>COMENTARIOS</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const enEdicion = editandoId === r.id

                return (
                  <tr key={r.id} className={`${enEdicion ? 'fila-editando' : ''} ${r.es_rebajada ? 'fila-rebajada' : ''} ${seleccionados.has(r.id) ? 'fila-seleccionada' : ''}`.trim()}>
                    <td className="td-checkbox">
                      <input
                        type="checkbox"
                        checked={seleccionados.has(r.id)}
                        onChange={() => toggleSeleccion(r.id)}
                        disabled={enEdicion}
                      />
                    </td>
                    <td className="td-id td-id-fija">
                      {r.id_notificacion ? (
                        <IdHighlight value={r.id_notificacion} />
                      ) : r.rit ? (
                        <span className="tribunal-badge">{r.rit}-{r.año}</span>
                      ) : (
                        <span className="sin-id">--</span>
                      )}
                    </td>

                    <td className="td-codigo td-codigo-editable">
                      {enEdicion ? (
                        <div className="codigo-input-wrapper">
                          <input
                            className="input-tabla input-codigo-editable"
                            type="text"
                            value={codigoEdit}
                            onChange={(e) => setCodigoEdit(e.target.value.toUpperCase())}
                            placeholder="Código o escribir"
                            title="Escribe el código o abre el diálogo para seleccionar"
                          />
                          <button
                            type="button"
                            className="boton-codigo-dialogo"
                            onClick={() => setDialogoCodigoAbierto(true)}
                            title="Seleccionar código del diálogo"
                          >
                            🔍
                          </button>
                        </div>
                      ) : (
                        <span className="codigo-badge">{codigoLimpioView(r.codigo)}</span>
                      )}
                    </td>

                    <td className="td-hora td-hora-ancha">
                      {enEdicion ? (
                        <input
                          className="input-tabla input-hora"
                          type="text"
                          inputMode="numeric"
                          maxLength="4"
                          value={horaEdit}
                          placeholder="HHMM"
                          onChange={(e) =>
                            setHoraEdit(e.target.value.replace(/[^\d]/g, '').slice(0, 4))
                          }
                        />
                      ) : (
                        r.hora
                      )}
                    </td>

                    <td className="td-tipo td-tipo-ancha">
                      {enEdicion ? (
                        <select
                          className="select-tabla"
                          value={esNoUrbanaEdit ? 'rural' : 'urbana'}
                          onChange={(e) => setEsNoUrbanaEdit(e.target.value === 'rural')}
                        >
                          <option value="urbana">URB</option>
                          <option value="rural">RURAL</option>
                        </select>
                      ) : (
                        <span className={`tipo-badge tipo-${r.es_no_urbana ? 'rural' : 'urbana'}`}>
                          {r.es_no_urbana ? 'RURAL' : 'URB'}
                        </span>
                      )}
                    </td>

                    <td className="td-lote">
                      {enEdicion ? (
                        <input
                          className="input-tabla input-lote"
                          type="text"
                          value={codigoLoteEdit}
                          placeholder="Código lote"
                          onChange={(e) => setCodigoLoteEdit(e.target.value)}
                        />
                      ) : (
                        <span className="codigo-lote-badge">{r.codigo_lote || '--'}</span>
                      )}
                    </td>

                    <td className="td-observacion td-observacion-ancha">
                      {enEdicion ? (
                        <button
                          type="button"
                          className="boton-editar-observacion"
                          onClick={abrirModalObservacion}
                          title="Editar observación"
                        >
                          <span className="observacion-preview">{observacionEdit || '(vacío)'}</span>
                          <span className="observacion-editar-texto">Editar</span>
                        </button>
                      ) : (
                        <span title={r.observacion}>{r.observacion}</span>
                      )}
                    </td>

                    <td className="td-comentarios td-comentarios-ancha">
                      {enEdicion ? (
                        <button
                          type="button"
                          className="boton-editar-observacion"
                          onClick={abrirModalComentarios}
                          title="Editar comentarios"
                        >
                          <span className="observacion-preview">{comentariosEdit || '(vacío)'}</span>
                          <span className="observacion-editar-texto">Editar</span>
                        </button>
                      ) : (
                        <span title={r.comentarios}>{r.comentarios}</span>
                      )}
                    </td>

                    <td className="td-acciones">
                      {enEdicion ? (
                        <div className="acciones-tabla">
                          <button
                            type="button"
                            className="boton-tabla guardar"
                            onClick={() => guardarEdicion(r.id)}
                            title="Guardar cambios"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            className="boton-tabla cancelar"
                            onClick={cancelarEdicion}
                            title="Cancelar edición"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        guardadoId === r.id ? (
                          <span className="guardado-badge">Guardado</span>
                        ) : (
                          <button
                            type="button"
                            className="boton-tabla editar"
                            onClick={() => iniciarEdicion(r)}
                            title="Editar registro"
                          >
                            ✎
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </>
      )}

      <CodigoDialog
        abierto={dialogoCodigoAbierto}
        titulo="Seleccionar código"
        valorActual={codigoLimpioView(codigoEdit)}
        onClose={() => setDialogoCodigoAbierto(false)}
        onSelect={seleccionarCodigoEdit}
      />

      {modalObservacionAbierta && (
        <Modal onClose={cancelarModalObservacion}>
          <div className="modal-observacion-contenido">
            <h3 className="modal-observacion-titulo">Editar Observación</h3>
            <textarea
              className="textarea-observacion-modal"
              value={observacionModalEdit}
              onChange={(e) => setObservacionModalEdit(e.target.value)}
              placeholder="Ingrese la observación (opcional)"
            />
            <div className="modal-observacion-acciones">
              <button
                type="button"
                className="boton-modal guardar-modal"
                onClick={guardarObservacionModal}
              >
                Guardar
              </button>
              <button
                type="button"
                className="boton-modal cancelar-modal"
                onClick={cancelarModalObservacion}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modalComentariosAbierta && (
        <Modal onClose={cancelarModalComentarios}>
          <div className="modal-observacion-contenido">
            <h3 className="modal-observacion-titulo">Editar Comentarios</h3>
            <textarea
              className="textarea-observacion-modal"
              value={comentariosModalEdit}
              onChange={(e) => setComentariosModalEdit(e.target.value)}
              placeholder="Ingrese comentarios (opcional)"
            />
            <div className="modal-observacion-acciones">
              <button
                type="button"
                className="boton-modal guardar-modal"
                onClick={guardarComentariosModal}
              >
                Guardar
              </button>
              <button
                type="button"
                className="boton-modal cancelar-modal"
                onClick={cancelarModalComentarios}
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default RegistroTable