import { useState } from 'react'
import IdHighlight from './IdHighlight'

const CODIGOS_EXITOSOS = new Set(['D2', 'D4', 'E1'])
const CODIGOS_BUSQUEDA = new Set(['B3', 'B7', 'B10'])
const CODIGOS_NEGATIVOS = new Set(['A1', 'A2', 'A3', 'B5'])

function RegistroTable({ registros, onRecargar, onActualizarRegistro, onDescargarCsv }) {
  const [editandoId, setEditandoId] = useState(null)
  const [codigoEdit, setCodigoEdit] = useState('')
  const [observacionEdit, setObservacionEdit] = useState('')

  const iniciarEdicion = (registro) => {
    setEditandoId(registro.id)
    setCodigoEdit(registro.codigo || '')
    setObservacionEdit(registro.observacion || '')
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setCodigoEdit('')
    setObservacionEdit('')
  }

  const guardarEdicion = async (id) => {
    const ok = await onActualizarRegistro({
      id,
      codigo: codigoEdit,
      observacion: observacionEdit,
    })

    if (ok?.ok) {
      cancelarEdicion()
    }
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
        <div className="tabla-wrapper">
          <table className="tabla-registros">
            <thead>
              <tr>
                <th>ID</th>
                <th>COD</th>
                <th>HORA</th>
                <th>TIPO</th>
                <th>OBS</th>
                <th>ACCION</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => {
                const enEdicion = editandoId === r.id

                return (
                  <tr key={r.id}>
                    <td>
                      <IdHighlight value={r.id_notificacion} />
                    </td>

                    <td>
                      {enEdicion ? (
                        <input
                          className="input-tabla"
                          type="text"
                          value={codigoEdit}
                          onChange={(e) =>
                            setCodigoEdit(
                              e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
                            )
                          }
                        />
                      ) : (
                        r.codigo
                      )}
                    </td>

                    <td>{r.hora}</td>
                    <td>{r.es_no_urbana ? 'RURAL' : 'URB'}</td>

                    <td>
                      {enEdicion ? (
                        <input
                          className="input-tabla"
                          type="text"
                          value={observacionEdit}
                          onChange={(e) => setObservacionEdit(e.target.value)}
                        />
                      ) : (
                        r.observacion
                      )}
                    </td>

                    <td>
                      {enEdicion ? (
                        <div className="acciones-tabla">
                          <button
                            type="button"
                            className="boton-tabla guardar"
                            onClick={() => guardarEdicion(r.id)}
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="boton-tabla cancelar"
                            onClick={cancelarEdicion}
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="boton-tabla editar"
                          onClick={() => iniciarEdicion(r)}
                        >
                          Editar
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
    </div>
  )
}

export default RegistroTable