import { Fragment, useEffect, useMemo, useState } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import { MapContainer, TileLayer, Polygon, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { POLIGONO_URBANO } from '../utils/geolocalizacion'
import 'leaflet/dist/leaflet.css'

function esCoordenadaValida(valor) {
  return Number.isFinite(valor) && Math.abs(valor) > 0
}

function normalizarHora(hora) {
  const texto = String(hora ?? '').trim()

  if (/^\d{4}$/.test(texto)) {
    return `${texto.slice(0, 2)}:${texto.slice(2, 4)}`
  }

  if (/^\d{3}$/.test(texto)) {
    const ajustada = texto.padStart(4, '0')
    return `${ajustada.slice(0, 2)}:${ajustada.slice(2, 4)}`
  }

  if (/^\d{2}:\d{2}$/.test(texto)) return texto

  return '00:00'
}

function obtenerMarcaTemporal(registro) {
  const fecha = String(registro.fecha_certificacion || '').trim()
  const hora = normalizarHora(registro.hora)
  const fechaHora = new Date(`${fecha}T${hora}`)
  const valor = fechaHora.getTime()

  return Number.isFinite(valor) ? valor : Number(registro.id || 0)
}

function obtenerClaveLote(registro) {
  const lote = String(registro.codigoLote ?? registro.codigo_lote ?? '').trim().toUpperCase()
  return lote || `SIN_LOTE_${registro.id}`
}

function desplazarDuplicado(latitud, longitud, indice) {
  if (indice <= 0) return [latitud, longitud]

  const radioMetros = 7 + indice * 3
  const angulo = indice * 2.4
  const deltaLat = (Math.cos(angulo) * radioMetros) / 111320
  const deltaLng = (Math.sin(angulo) * radioMetros) / (111320 * Math.cos((latitud * Math.PI) / 180))

  return [latitud + deltaLat, longitud + deltaLng]
}

function crearIconoNumero(numero, count, esNoUrbana, esDuplicada) {
  const claseColor = esDuplicada && !esNoUrbana ? 'marker-duplicada-urbana' : (esNoUrbana ? 'marker-rural' : 'marker-urbana')

  return divIcon({
    className: 'consulta-mapa-divicon',
    html: `
      <div class="consulta-mapa-marker ${claseColor}">
        <span class="consulta-mapa-marker-numero">${numero}</span>
        ${count > 1 ? `<span class="consulta-mapa-marker-count">${count}</span>` : ''}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  })
}

function crearIconoSimple(esNoUrbana, esDuplicada) {
  const esDuplicadaUrbana = esDuplicada && !esNoUrbana

  return divIcon({
    className: 'consulta-mapa-divicon-simple',
    html: `
      <div class="consulta-mapa-simple-wrap ${esNoUrbana ? 'simple-rural' : 'simple-urbana'}">
        <div class="consulta-mapa-dot ${esDuplicadaUrbana ? 'dot-duplicada-urbana' : (esNoUrbana ? 'dot-rural' : 'dot-urbana')}"></div>
        ${esDuplicada ? '<span class="consulta-mapa-simple-count">dup</span>' : ''}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function AjustarVista({ tienePuntos, bounds }) {
  const map = useMap()

  useEffect(() => {
    if (!tienePuntos || !bounds) return
    map.fitBounds(bounds, { padding: [20, 20] })
  }, [map, tienePuntos, bounds])

  return null
}

export default function ConsultaMapa({ registros }) {
  const [viewMode, setViewMode] = useState('puntos')

  const registrosCount = (registros || []).length
  const sinCoordenadas = (registros || [])
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !(esCoordenadaValida(Number(r.latitud)) && esCoordenadaValida(Number(r.longitud))))
    .map(({ r, i }) => ({ id: r.id || r.id_notificacion || `r-${i}`, lat: r.latitud, lng: r.longitud }))

  const coordStats = useMemo(() => {
    const mapa = new Map()
    for (const r of registros || []) {
      const lat = Number(r.latitud)
      const lng = Number(r.longitud)
      if (!esCoordenadaValida(lat) || !esCoordenadaValida(lng)) continue
      const key = `${lat.toFixed(6)}|${lng.toFixed(6)}`
      mapa.set(key, (mapa.get(key) || 0) + 1)
    }
    let duplicados = 0
    for (const v of mapa.values()) if (v > 1) duplicados += v - 1
    return { uniqueCoords: mapa.size, duplicatedPoints: duplicados }
  }, [registros])

  // debug output to console to help investigate missing markers
  if (sinCoordenadas.length > 0) {
    // eslint-disable-next-line no-console
    console.debug('ConsultaMapa: registros totales=', registrosCount, 'puntos=', registros ? registros.length : 0, 'sinCoordenadas=', sinCoordenadas)
  }

  const puntos = useMemo(() => {
    const filtrados = (registros || [])
      .filter((registro) => esCoordenadaValida(Number(registro.latitud)) && esCoordenadaValida(Number(registro.longitud)))
      .map((registro, idx) => ({
        id: registro.id || `r-${idx}`,
        latitud: Number(registro.latitud),
        longitud: Number(registro.longitud),
        esNoUrbana: Boolean(registro.es_no_urbana),
        codigo: registro.codigo || '',
        observacion: registro.observacion || '',
        fecha: registro.fecha_certificacion || '',
        hora: registro.hora || '',
        marcaTemporal: obtenerMarcaTemporal(registro),
        codigoLote: String(registro.codigo_lote ?? '').trim().toUpperCase(),
        idNotificacion: registro.id_notificacion || registro.rit || '',
      }))

    const agrupados = new Map()

    for (const punto of filtrados) {
      const claveCoordenada = `${punto.latitud.toFixed(6)}|${punto.longitud.toFixed(6)}`
      const actual = agrupados.get(claveCoordenada)

      if (!actual) {
        agrupados.set(claveCoordenada, {
          claveCoordenada,
          latitud: punto.latitud,
          longitud: punto.longitud,
          esNoUrbana: punto.esNoUrbana,
          numero: 0,
          count: 1,
          ids: [punto.id],
          idNotificaciones: [punto.idNotificacion].filter(Boolean),
          codigoLotes: [punto.codigoLote].filter(Boolean),
          observaciones: [punto.observacion].filter(Boolean),
          fechas: [punto.fecha].filter(Boolean),
          horas: [punto.hora].filter(Boolean),
          marcaTemporal: punto.marcaTemporal,
        })
        continue
      }

      actual.count += 1
      actual.ids.push(punto.id)
      if (punto.idNotificacion) actual.idNotificaciones.push(punto.idNotificacion)
      if (punto.codigoLote) actual.codigoLotes.push(punto.codigoLote)
      if (punto.observacion) actual.observaciones.push(punto.observacion)
      if (punto.fecha) actual.fechas.push(punto.fecha)
      if (punto.hora) actual.horas.push(punto.hora)
      actual.marcaTemporal = Math.min(actual.marcaTemporal, punto.marcaTemporal)
    }

    return [...agrupados.values()]
      .sort((a, b) => a.marcaTemporal - b.marcaTemporal)
      .map((grupo, idx) => ({
        ...grupo,
        numero: idx + 1,
        esDuplicadaCoordenada: grupo.count > 1,
      }))
  }, [registros])

  const todos = useMemo(() => {
    const filtrados = (registros || []).filter((registro) => esCoordenadaValida(Number(registro.latitud)) && esCoordenadaValida(Number(registro.longitud)))

    const contadorPorCoordenada = new Map()
    for (const registro of filtrados) {
      const lat = Number(registro.latitud)
      const lng = Number(registro.longitud)
      const key = `${lat.toFixed(6)}|${lng.toFixed(6)}`
      const actual = contadorPorCoordenada.get(key) || { count: 0, ids: [], idNotificaciones: [] }
      actual.count += 1
      if (registro.id) actual.ids.push(registro.id)
      const idNotificacion = registro.id_notificacion || registro.rit || ''
      if (idNotificacion) actual.idNotificaciones.push(idNotificacion)
      contadorPorCoordenada.set(key, actual)
    }

    // detectar duplicados por coordenada exacta y desplazar visualmente para que no se oculten
    const contadorCoords = new Map()

    return filtrados.map((registro, idx) => {
      const lat = Number(registro.latitud)
      const lng = Number(registro.longitud)
      const key = `${lat.toFixed(6)}|${lng.toFixed(6)}`
      const occ = contadorCoords.get(key) || 0
      contadorCoords.set(key, occ + 1)
      const grupo = contadorPorCoordenada.get(key) || { count: 1, ids: [], idNotificaciones: [] }

      const [latitudVisual, longitudVisual] = desplazarDuplicado(lat, lng, occ)

      return {
        id: registro.id || `r-${idx}`,
        latitud: lat,
        longitud: lng,
        latitudVisual,
        longitudVisual,
        esDuplicadaCoordenada: grupo.count > 1,
        grupoCount: grupo.count,
        grupoIds: grupo.ids,
        grupoIdNotificaciones: grupo.idNotificaciones,
        esNoUrbana: Boolean(registro.es_no_urbana),
        codigo: registro.codigo || '',
        observacion: registro.observacion || '',
        fecha: registro.fecha_certificacion || '',
        hora: registro.hora || '',
        idNotificacion: registro.id_notificacion || registro.rit || '',
      }
    })
  }, [registros])

  const centro = useMemo(() => {
    // Prefer the current view's points when centering the map. Fallback to whichever set has points.
    const fuentePreferida = viewMode === 'puntos' ? puntos : todos
    const fuente = (fuentePreferida && fuentePreferida.length > 0)
      ? fuentePreferida
      : (puntos.length > 0 ? puntos : todos)

    if (!fuente || fuente.length === 0) return [-22.4638, -68.9439]

    const totalLat = fuente.reduce((acc, p) => acc + p.latitud, 0)
    const totalLng = fuente.reduce((acc, p) => acc + p.longitud, 0)

    return [totalLat / fuente.length, totalLng / fuente.length]
  }, [puntos, todos])

  const positions = useMemo(() => {
    const polygonLatLngs = POLIGONO_URBANO.map(([lng, lat]) => [lat, lng])
    const puntosLatLngs = (viewMode === 'puntos'
      ? (puntos.length > 0
        ? puntos.map((punto) => [punto.latitudVisual, punto.longitudVisual])
        : todos.map((t) => [t.latitud, t.longitud]))
      : todos.map((t) => [t.latitud, t.longitud]))

    return { polygonLatLngs, puntosLatLngs }
  }, [puntos, todos, viewMode])

  const segmentosTraza = useMemo(() => {
    if (puntos.length < 2) return []

    return puntos.slice(1).map((puntoActual, indice) => {
      const puntoAnterior = puntos[indice]
      const color = puntoActual.esNoUrbana ? '#dc2626' : '#0284c7'

      return {
        id: `${puntoAnterior.id}-${puntoActual.id}-${indice}`,
        posiciones: [
          [puntoAnterior.latitud, puntoAnterior.longitud],
          [puntoActual.latitud, puntoActual.longitud],
        ],
        color,
      }
    })
  }, [puntos])

  const bounds = useMemo(() => {
    const puntosBounds = (viewMode === 'puntos'
      ? (puntos.length > 0
        ? puntos.map((punto) => [punto.latitud, punto.longitud])
        : todos.map((t) => [t.latitud, t.longitud]))
      : todos.map((t) => [t.latitud, t.longitud]))

    const coords = [...POLIGONO_URBANO.map(([lng, lat]) => [lat, lng]), ...puntosBounds]

    return coords.length > 0 ? latLngBounds(coords) : null
  }, [puntos, todos, viewMode])

  const tienePuntos = puntos.length > 0 || todos.length > 0

  return (
    <section className="consulta-mapa-panel">
      <div className="consulta-mapa-header">
        <div>
          <p className="consulta-kicker">Mapa geográfico</p>
          <h3>Coordenadas y polígono urbano</h3>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ fontSize: 13, color: '#334155' }}>Mostrar:</label>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="input-base" style={{ height: 36 }}>
              <option value="puntos">Por puntos (agrupado)</option>
              <option value="todas">Todas (cada ubicación)</option>
            </select>
          </div>

          <div className="consulta-mapa-leyenda">
            <span className="leyenda-item"><i className="leyenda-color leyenda-urbana" /> Urbana</span>
            <span className="leyenda-item"><i className="leyenda-color leyenda-rural" /> Rural</span>
          </div>
        </div>
      </div>

      <div className="consulta-mapa-wrap">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#334155' }}>
            <strong>Debug:</strong>&nbsp;Registros: {registrosCount} · Agrupados (puntos): {puntos.length} · Todas (ubicaciones): {todos.length} · Coordenadas únicas: {coordStats.uniqueCoords} · Solapadas exactas: {coordStats.duplicatedPoints}
          </div>
          {sinCoordenadas.length > 0 ? (
            <div style={{ fontSize: 12, color: '#7f8c8d', marginTop: 4 }}>
              IDs sin coordenadas: {sinCoordenadas.map(s => `${s.id}(${s.lat ?? 'n/a'},${s.lng ?? 'n/a'})`).slice(0, 10).join(', ')}
            </div>
          ) : null}
        </div>
        {tienePuntos ? (
          <MapContainer center={centro} zoom={13} scrollWheelZoom className="consulta-mapa">
            <AjustarVista tienePuntos={tienePuntos} bounds={bounds} />
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polygon
              positions={positions.polygonLatLngs}
              pathOptions={{ color: '#0b3c5d', weight: 2, fillColor: '#0b3c5d', fillOpacity: 0.12 }}
            />

            {viewMode === 'puntos' ? (
              <>
                {segmentosTraza.map((segmento) => (
                  <Fragment key={segmento.id}>
                    <Polyline
                      positions={segmento.posiciones}
                      pathOptions={{
                        color: '#0f172a',
                        weight: 8,
                        opacity: 0.18,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                    <Polyline
                      positions={segmento.posiciones}
                      pathOptions={{
                        color: segmento.color,
                        weight: 4,
                        opacity: 0.95,
                        lineCap: 'round',
                        lineJoin: 'round',
                        dashArray: '6 8',
                      }}
                    />
                  </Fragment>
                ))}

                {puntos.map((punto, _idx) => (
                  <Marker
                    key={`${punto.id}-${_idx}`}
                    position={[punto.latitud, punto.longitud]}
                    icon={crearIconoNumero(punto.numero, punto.count, punto.esNoUrbana, punto.esDuplicadaCoordenada)}
                  >
                    <Popup>
                      <div className="consulta-mapa-popup">
                        <strong>Secuencia {punto.numero}</strong>
                        <div>Total en este punto: {punto.count}</div>
                        <div>IDs de notificación: {(punto.idNotificaciones || []).join(', ') || 'Sin ID'}</div>
                        <div>Tipo: {punto.esNoUrbana ? 'No urbana' : 'Urbana'}</div>
                        <div>Lat: {punto.latitud.toFixed(6)}</div>
                        <div>Lng: {punto.longitud.toFixed(6)}</div>
                        {punto.codigoLotes?.length ? <div>Lote(s): {punto.codigoLotes.join(', ')}</div> : null}
                        {punto.observaciones?.length ? <div className="consulta-mapa-popup-observacion">{punto.observaciones.join(' | ')}</div> : null}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </>
            ) : (
              <>
                {todos.map((t, _idx) => (
                  <Marker
                    key={`${t.id}-${_idx}`}
                    position={[t.latitudVisual ?? t.latitud, t.longitudVisual ?? t.longitud]}
                    icon={crearIconoSimple(t.esNoUrbana, t.esDuplicadaCoordenada)}
                    zIndexOffset={t.esDuplicadaCoordenada ? 1000 + _idx : _idx}
                  >
                    <Popup>
                      <div className="consulta-mapa-popup">
                        <strong>{t.esDuplicadaCoordenada ? `Coordenada repetida (${t.grupoCount || 1})` : (t.idNotificacion || 'Sin ID')}</strong>
                        {t.esDuplicadaCoordenada ? (
                          <div>IDs de notificación: {(t.grupoIdNotificaciones || []).join(', ') || 'Sin ID'}</div>
                        ) : null}
                        <div>Código: {t.codigo || '--'}</div>
                        <div>Fecha: {t.fecha || '--'}</div>
                        <div>Hora: {t.hora || '--'}</div>
                        <div>Tipo: {t.esNoUrbana ? 'No urbana' : 'Urbana'}</div>
                        <div>Lat: {t.latitud.toFixed(6)}</div>
                        <div>Lng: {t.longitud.toFixed(6)}</div>
                        {t.observacion ? <div className="consulta-mapa-popup-observacion">{t.observacion}</div> : null}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </>
            )}
          </MapContainer>
        ) : (
          <div className="consulta-mapa-vacio">
            No hay coordenadas disponibles para la fecha seleccionada.
          </div>
        )}
      </div>
    </section>
  )
}
