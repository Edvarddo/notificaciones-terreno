import { useState } from 'react'
import IdHighlight from './IdHighlight'
import CodigoDialog from '../features/CodigoDialog'

const CODIGOS_EXITOSOS = new Set(['D2', 'D4', 'E1'])
const CODIGOS_BUSQUEDA = new Set(['B3', 'B7', 'B10'])
const CODIGOS_NEGATIVOS = new Set(['A1', 'A2', 'A3', 'B5'])

function RegistroTable({ registros, onRecargar, onActualizarRegistro, onDescargarCsv }) {
  const [editandoId, setEditandoId] = useState(null)
  const [codigoEdit, setCodigoEdit] = useState('')
  const [horaEdit, setHoraEdit] = useState('')
  const [esNoUrbanaEdit, setEsNoUrbanaEdit] = useState(false)
  const [dialogoCodigoAbierto, setDialogoCodigoAbierto] = useState(false)

  const iniciarEdicion = (registro) => {
    setEditandoId(registro.id)
    setCodigoEdit(registro.codigo || '')
    setHoraEdit(registro.hora || '')
    setEsNoUrbanaEdit(registro.es_no_urbana || false)
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setCodigoEdit('')
    setHoraEdit('')
    setEsNoUrbanaEdit(false)
    setDialogoCodigoAbierto(false)
  }

  const guardarEdicion = async (id) => {
    const ok = await onActualizarRegistro({
      id,
      codigo: codigoEdit,
      hora: horaEdit,
      es_no_urbana: esNoUrbanaEdit,
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
                <th>ID NOTIF</th>
                <th>CÓDIGO</th>
                <th>HORA</th>
                <th>TIPO</th>
                <th>OBSERVACIÓN</th>
                <th>ACCIÓN</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const enEdicion = editandoId === r.id

                return (
                  <tr key={r.id} className={enEdicion ? 'fila-editando' : ''}>
                    <td className="td-id td-id-fija">
                      <IdHighlight value={r.id_notificacion} />
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
                      <span title={r.observacion}>{r.observacion}</span>
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
    </div>
  )
}

export default RegistroTable