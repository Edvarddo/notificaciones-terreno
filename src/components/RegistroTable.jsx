import { useState } from 'react'
import IdHighlight from './IdHighlight'
import CodigoDialog from '../features/CodigoDialog'
import Modal from './Modal'

const CODIGOS_EXITOSOS = new Set(['D2', 'D4', 'E1'])
const CODIGOS_BUSQUEDA = new Set(['B3', 'B7', 'B10'])
const CODIGOS_NEGATIVOS = new Set(['A1', 'A2', 'A3', 'B5'])

function RegistroTable({ registros, onRecargar, onActualizarRegistro, onDescargarCsv, cargaTotal = 0, puntos = 0 }) {
  const [editandoId, setEditandoId] = useState(null)
  const [codigoEdit, setCodigoEdit] = useState('')
  const [horaEdit, setHoraEdit] = useState('')
  const [esNoUrbanaEdit, setEsNoUrbanaEdit] = useState(false)
  const [observacionEdit, setObservacionEdit] = useState('')
  const [comentariosEdit, setComentariosEdit] = useState('')
  const [dialogoCodigoAbierto, setDialogoCodigoAbierto] = useState(false)
  const [modalObservacionAbierta, setModalObservacionAbierta] = useState(false)
  const [observacionModalEdit, setObservacionModalEdit] = useState('')
  const [modalComentariosAbierta, setModalComentariosAbierta] = useState(false)
  const [comentariosModalEdit, setComentariosModalEdit] = useState('')

  const iniciarEdicion = (registro) => {
    setEditandoId(registro.id)
    setCodigoEdit(registro.codigo || '')
    setHoraEdit(registro.hora || '')
    setEsNoUrbanaEdit(registro.es_no_urbana || false)
    setObservacionEdit(registro.observacion || '')
    setComentariosEdit(registro.comentarios || '')
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setCodigoEdit('')
    setHoraEdit('')
    setEsNoUrbanaEdit(false)
    setObservacionEdit('')
    setComentariosEdit('')
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
    })

    if (ok?.ok) {
      cancelarEdicion()
    }
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

      if (r.es_no_urbana) acc.noUrbanas += 1
      else acc.urbanas += 1

      return acc
    },
    {
      total: 0,
      exitosas: 0,
      busqueda: 0,
      negativas: 0,
      urbanas: 0,
      noUrbanas: 0,
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
          <span className="mini-valor">{resumen.urbanas}</span>
        </div>

        <div className="resumen-mini">
          <span className="mini-label">Rurales</span>
          <span className="mini-valor">{resumen.noUrbanas}</span>
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
        <div className="tabla-wrapper tabla-wrapper-registros">
          <table className="tabla-registros tabla-registros-ancha">
            <thead>
              <tr>
                <th>ID / RIT</th>
                <th>CÓDIGO</th>
                <th>HORA</th>
                <th>TIPO</th>
                <th>OBSERVACIÓN</th>
                <th>COMENTARIOS</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const enEdicion = editandoId === r.id

                return (
                  <tr key={r.id} className={`${enEdicion ? 'fila-editando' : ''} ${r.es_rebajada ? 'fila-rebajada' : ''}`.trim()}>
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
                        <button
                          type="button"
                          className="codigo-selector-boton"
                          onClick={() => setDialogoCodigoAbierto(true)}
                          title="Seleccionar código"
                        >
                          <span className="codigo-badge">{codigoLimpioView(codigoEdit) || 'SELECCIONAR'}</span>
                          <span className="codigo-selector-texto">Cambiar código</span>
                        </button>
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
                        <button
                          type="button"
                          className="boton-tabla editar"
                          onClick={() => iniciarEdicion(r)}
                          title="Editar registro"
                        >
                          ✎
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
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