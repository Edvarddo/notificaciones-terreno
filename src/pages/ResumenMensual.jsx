import { useEffect, useMemo, useState } from 'react'
import { obtenerResumenNotificaciones } from '../services/notificaciones'

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
]

function ResumenMensual() {
  const hoy = new Date()

  const [año, setAño] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [dia, setDia] = useState('')
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const diasDelMes = useMemo(() => {
    return new Date(Number(año), Number(mes), 0).getDate()
  }, [año, mes])

  const cargarResumen = async () => {
    setCargando(true)
    setError('')

    try {
      const data = await obtenerResumenNotificaciones({
        año,
        mes,
        dia,
      })

      setResumen(data)
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el resumen')
      setResumen(null)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarResumen()
  }, [año, mes, dia])

  const total = resumen?.total || {
    cargaTotal: 0,
    puntos: 0,
    urbanas: 0,
    rurales: 0,
  }

  return (
    <main className="resumen-page">
      <section className="resumen-header">
        <div>
          <span className="resumen-kicker">Resumen</span>
          <h1>Resumen mensual de notificaciones</h1>
          <p>
            Consulta carga total, puntos, urbanas y rurales por mes o por día.
          </p>
        </div>
      </section>

      <section className="resumen-filtros">
        <label>
          Año
          <input
            type="number"
            className="input-base"
            value={año}
            onChange={(e) => setAño(e.target.value)}
          />
        </label>

        <label>
          Mes
          <select
            className="input-base"
            value={mes}
            onChange={(e) => {
              setMes(Number(e.target.value))
              setDia('')
            }}
          >
            {MESES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Día opcional
          <select
            className="input-base"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          >
            <option value="">Todo el mes</option>
            {Array.from({ length: diasDelMes }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                Día {d}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? <div className="mensaje-error">{error}</div> : null}

      <section className="resumen-cards">
        <div className="resumen-card">
          <span>Carga total</span>
          <strong>{total.cargaTotal}</strong>
        </div>

        <div className="resumen-card">
          <span>Puntos</span>
          <strong>{total.puntos}</strong>
        </div>

        <div className="resumen-card">
          <span>Urbanas</span>
          <strong>{total.urbanas}</strong>
        </div>

        <div className="resumen-card">
          <span>Rurales</span>
          <strong>{total.rurales}</strong>
        </div>
      </section>

      <section className="resumen-tabla-card">
        <div className="resumen-tabla-header">
          <h2>{dia ? 'Resumen del día' : 'Resumen por día'}</h2>
          {cargando ? <span>Cargando...</span> : null}
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-monitoreo">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Carga total</th>
                <th>Puntos</th>
                <th>Urbanas</th>
                <th>Rurales</th>
              </tr>
            </thead>

            <tbody>
              {resumen?.dias?.length ? (
                resumen.dias.map((item) => (
                  <tr key={item.fecha}>
                    <td>{item.fecha}</td>
                    <td>{item.cargaTotal}</td>
                    <td>{item.puntos}</td>
                    <td>{item.urbanas}</td>
                    <td>{item.rurales}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>No hay registros para el período seleccionado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

export default ResumenMensual