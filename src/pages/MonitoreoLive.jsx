import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { obtenerRegistros, actualizarRegistroPorId } from '../services/notificaciones'

function generarIdPrueba() {
  // generar un id_notificacion aleatorio de 1-8 dígitos
  return String(Math.floor(100000 + Math.random() * 899999))
}

function MonitoreoLive({ fechaCertificacion }) {
  const [registros, setRegistros] = useState([])
  const [editandoId, setEditandoId] = useState(null)
  const [esRebajadaEdit, setEsRebajadaEdit] = useState(false)
  const mounted = useRef(true)
  const channelRef = useRef(null)

  async function refetch() {
    try {
      const data = await obtenerRegistros(fechaCertificacion)
      if (mounted.current) setRegistros(data || [])
      console.log('Refetched registros, count=', data?.length || 0)
    } catch (err) {
      console.error('Error refetch', err)
    }
  }

  useEffect(() => {
    mounted.current = true

    async function cargarInicial() {
      try {
        const data = await obtenerRegistros(fechaCertificacion)
        if (mounted.current) setRegistros(data || [])
      } catch (err) {
        console.error('Error cargando registros iniciales', err)
      }
    }

    cargarInicial()

    // Solo polling: refresca cada 10 segundos.
    console.log('Iniciando polling al montar MonitoreoLive (cada 10s)')
    const pollInterval = setInterval(async () => {
      try {
        const data = await obtenerRegistros(fechaCertificacion)
        if (!mounted.current) return
        const count = data?.length || 0
        setRegistros(data || [])
        setLastRefetch(new Date())
        setRefetchCount((prev) => prev + 1)
        console.log('Polling refetch encontró', count, 'registros')
      } catch (e) {
        console.warn('Polling error', e)
      }
    }, 10000)

    pollingRef.current = pollInterval
    setPollingActive(true)

    return () => {
      mounted.current = false
      // Detener polling
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      setPollingActive(false)
      console.log('MonitoreoLive cleanup: polling detenido')
    }
  }, [fechaCertificacion])

  const reiniciarSuscripcion = async () => {
    await refetch()
  }

  const abrirEdicion = (registro) => {
    setEditandoId(registro.id)
    setEsRebajadaEdit(registro.es_rebajada || false)
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setEsRebajadaEdit(false)
  }

  const guardarEdicion = async (id) => {
    try {
      await actualizarRegistroPorId(id, { es_rebajada: esRebajadaEdit })
      // Actualizar estado local
      setRegistros((prev) =>
        prev.map((r) => (r.id === id ? { ...r, es_rebajada: esRebajadaEdit } : r))
      )
      cancelarEdicion()
    } catch (err) {
      console.error('Error actualizando es_rebajada', err)
    }
  }

  // Polling fallback (dev) to detect changes if realtime fails
  const pollingRef = useRef(null)
  const [pollingActive, setPollingActive] = useState(false)
  const [lastRefetch, setLastRefetch] = useState(null)
  const [refetchCount, setRefetchCount] = useState(0)

  const startPolling = () => {
    if (pollingRef.current) return
    console.log('Polling iniciado (cada 2s)')
    pollingRef.current = setInterval(async () => {
      try {
        const data = await obtenerRegistros(fechaCertificacion)
        if (!mounted.current) return
        const count = data?.length || 0
        setRegistros(data || [])
        setLastRefetch(new Date())
        setRefetchCount((prev) => prev + 1)
        console.log('Polling refetch encontró', count, 'registros')
      } catch (e) {
        console.warn('Polling error', e)
      }
    }, 2000)
    setPollingActive(true)
  }

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setPollingActive(false)
  }

  return (
    <div className="monitoreo-live pagina-desktop-only">
      <h2>Monitoreo por refetch</h2>
      <p className="kicker">Notificaciones subidas desde terreno (solo lectura, refresco cada 10 segundos)</p>

      <div className="tabla-wrapper">
        <table className="tabla-monitoreo">
          <thead>
            <tr>
              <th>ID</th>
              <th>ID Notif</th>
              <th>Codigo</th>
              <th>Hora</th>
              <th>Observacion</th>
              <th>Rebajada</th>
              <th>Codigo Lote</th>
              <th>No Urbana</th>
              <th>Comentarios</th>
              <th>ACCIÓN</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r) => {
              const enEdicion = editandoId === r.id
              return (
                <tr key={r.id} className={enEdicion ? 'fila-editando' : ''}>
                  <td>{r.id}</td>
                  <td>{r.id_notificacion}</td>
                  <td>{r.codigo}</td>
                  <td>{r.hora}</td>
                  <td>{r.observacion}</td>
                  <td>
                    {enEdicion ? (
                      <select
                        className="select-tabla"
                        value={esRebajadaEdit ? 'rebajada' : 'no-rebajada'}
                        onChange={(e) => setEsRebajadaEdit(e.target.value === 'rebajada')}
                      >
                        <option value="no-rebajada">No</option>
                        <option value="rebajada">Sí</option>
                      </select>
                    ) : (
                      <span className={`rebajada-badge ${r.es_rebajada ? 'rebajada-si' : 'rebajada-no'}`}>
                        {r.es_rebajada ? 'SÍ' : 'NO'}
                      </span>
                    )}
                  </td>
                  <td>{r.codigo_lote}</td>
                  <td>{r.es_no_urbana ? 'Sí' : 'No'}</td>
                  <td>{r.comentarios}</td>
                  <td>
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
                        onClick={() => abrirEdicion(r)}
                        title="Editar rebajada"
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
    </div>
  )
}

export default MonitoreoLive
