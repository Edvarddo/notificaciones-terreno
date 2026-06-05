import { Fragment, useEffect, useMemo, useState } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import { MapContainer, TileLayer, Polygon, Marker, Polyline, Popup, useMap } from 'react-leaflet'
import { POLIGONO_URBANO } from '../data/poligonoCalama'
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

function claveCoordenada(latitud, longitud) {
  return `${Number(latitud).toFixed(6)}|${Number(longitud).toFixed(6)}`
}

function crearIconoGrupo(numero, count, esNoUrbana, esLote) {
  const claseColor = esLote ? 'marker-lote' : (esNoUrbana ? 'marker-rural' : 'marker-urbana')

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

  const registrosNormalizados = useMemo(() => {
    return (registros || [])
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
        codigoLote: String(registro.codigoLote ?? registro.codigo_lote ?? '').trim().toUpperCase(),
        idNotificacion: registro.id_notificacion || registro.rit || '',
      }))
      .filter((registro) => esCoordenadaValida(registro.latitud) && esCoordenadaValida(registro.longitud))
      .sort((a, b) => a.marcaTemporal - b.marcaTemporal)
      .map((registro, idx) => ({
        ...registro,
        secuencia: idx + 1,
      }))
  }, [registros])

  const unidadesVisibles = useMemo(() => {
    const mapa = new Map()

    for (const registro of registrosNormalizados) {
      const lote = registro.codigoLote
      if (!lote) continue

      const actual = mapa.get(lote) || {
        lote,
        registros: [],
      }

      actual.registros.push(registro)
      mapa.set(lote, actual)
    }

    const grupos = Array.from(mapa.values())
      .filter((grupo) => grupo.registros.length > 1)
      .map((grupo) => ({
        ...grupo,
        tipo: 'lote',
        count: grupo.registros.length,
        secuencias: grupo.registros.map((r) => r.secuencia),
        idsNotificacion: grupo.registros.map((r) => r.idNotificacion).filter(Boolean),
        observaciones: grupo.registros.map((r) => r.observacion).filter(Boolean),
        esNoUrbana: grupo.registros.every((r) => r.esNoUrbana),
        latitud: grupo.registros[0].latitud,
        longitud: grupo.registros[0].longitud,
        primero: grupo.registros[0],
      }))

    const individuales = registrosNormalizados.filter((registro) => {
      return !mapa.has(registro.codigoLote) || (mapa.get(registro.codigoLote)?.registros?.length || 0) <= 1
    })

    const unidades = [
      ...grupos,
      ...individuales.map((registro) => ({
        tipo: 'individual',
        key: `reg-${registro.id}`,
        count: 1,
        esNoUrbana: registro.esNoUrbana,
        latitud: registro.latitud,
        longitud: registro.longitud,
        lote: registro.codigoLote,
        registros: [registro],
        primero: registro,
      })),
    ]
      .sort((a, b) => a.primero.secuencia - b.primero.secuencia)
      .map((unidad, idx) => ({
        ...unidad,
        numero: idx + 1,
      }))

    return unidades
  }, [registrosNormalizados])

  const lotesAgrupados = useMemo(() => {
    return new Set(unidadesVisibles.filter((unidad) => unidad.tipo === 'lote').map((grupo) => grupo.lote))
  }, [unidadesVisibles])

  const registrosCount = (registros || []).length

  const sinCoordenadas = (registros || [])
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !(esCoordenadaValida(Number(r.latitud)) && esCoordenadaValida(Number(r.longitud))))
    .map(({ r, i }) => ({
      id: r.id || r.id_notificacion || `r-${i}`,
      lat: r.latitud,
      lng: r.longitud,
    }))

  const coordStats = useMemo(() => {
    const mapa = new Map()

    for (const r of registrosNormalizados) {
      const key = claveCoordenada(r.latitud, r.longitud)
      mapa.set(key, (mapa.get(key) || 0) + 1)
    }

    let duplicados = 0
    for (const v of mapa.values()) {
      if (v > 1) duplicados += v - 1
    }

    return {
      uniqueCoords: mapa.size,
      duplicatedPoints: duplicados,
    }
  }, [registrosNormalizados])

  const marcadores = useMemo(() => {
    return unidadesVisibles.map((unidad) => {
      if (unidad.tipo === 'lote') {
        return {
          tipo: 'lote',
          key: `lote-${unidad.lote}`,
          numero: unidad.numero,
          count: unidad.count,
          esNoUrbana: unidad.esNoUrbana,
          latitud: unidad.latitud,
          longitud: unidad.longitud,
          lote: unidad.lote,
          registros: unidad.registros,
        }
      }

      return {
        tipo: 'individual',
        key: unidad.key,
        numero: unidad.numero,
        count: 1,
        esNoUrbana: unidad.esNoUrbana,
        latitud: unidad.latitud,
        longitud: unidad.longitud,
        lote: unidad.lote,
        registros: unidad.registros,
      }
    })
  }, [unidadesVisibles])

  const centro = useMemo(() => {
    if (marcadores.length === 0) return [-22.4638, -68.9439]

    const totalLat = marcadores.reduce((acc, p) => acc + p.latitud, 0)
    const totalLng = marcadores.reduce((acc, p) => acc + p.longitud, 0)

    return [totalLat / marcadores.length, totalLng / marcadores.length]
  }, [marcadores])

  const bounds = useMemo(() => {
    const coords = [
      ...POLIGONO_URBANO.map(([lng, lat]) => [lat, lng]),
      ...marcadores.map((grupo) => [grupo.latitud, grupo.longitud]),
    ]

    return coords.length > 0 ? latLngBounds(coords) : null
  }, [marcadores])

  const tienePuntos = marcadores.length > 0

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
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="input-base"
              style={{ height: 36 }}
            >
              <option value="puntos">Por puntos (agrupado)</option>
              <option value="todas">Todas (cada ubicación)</option>
            </select>
          </div>

          <div className="consulta-mapa-leyenda">
            <span className="leyenda-item">
              <i className="leyenda-color leyenda-urbana" /> Urbana
            </span>
            <span className="leyenda-item">
              <i className="leyenda-color leyenda-rural" /> Rural
            </span>
          </div>
        </div>
      </div>

      <div className="consulta-mapa-wrap">
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, color: '#334155' }}>
            <strong>Debug:</strong>&nbsp;Registros: {registrosCount} · Marcadores: {marcadores.length} · Coordenadas únicas: {coordStats.uniqueCoords} · Solapadas exactas: {coordStats.duplicatedPoints}
          </div>

          {sinCoordenadas.length > 0 ? (
            <div style={{ fontSize: 12, color: '#7f8c8d', marginTop: 4 }}>
              IDs sin coordenadas: {sinCoordenadas.map((s) => `${s.id}(${s.lat ?? 'n/a'},${s.lng ?? 'n/a'})`).slice(0, 10).join(', ')}
            </div>
          ) : null}
        </div>

        {tienePuntos ? (
          <MapContainer
            center={centro}
            zoom={13}
            minZoom={3}
            maxZoom={25}
            zoomControl={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            touchZoom={true}
            zoomSnap={1}
            zoomDelta={1}
            className="consulta-mapa"
          >
            <AjustarVista tienePuntos={tienePuntos} bounds={bounds} />

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxNativeZoom={19}
              maxZoom={25}
            />

            <Polygon
              positions={POLIGONO_URBANO.map(([lng, lat]) => [lat, lng])}
              pathOptions={{
                color: '#0b3c5d',
                weight: 2,
                fillColor: '#0b3c5d',
                fillOpacity: 0.12,
              }}
            />

            {marcadores.map((marcador) => (
              <Marker
                key={marcador.key}
                position={[marcador.latitud, marcador.longitud]}
                riseOnHover={true}
                icon={crearIconoGrupo(
                  marcador.numero,
                  marcador.count,
                  marcador.esNoUrbana,
                  marcador.tipo === 'lote'
                )}
              >
                <Popup>
                  <div className="consulta-mapa-popup">
                    <strong>Secuencia {marcador.numero}</strong>
                    <div>Total en este punto: {marcador.count}</div>
                    <div>Lat: {marcador.latitud.toFixed(6)}</div>
                    <div>Lng: {marcador.longitud.toFixed(6)}</div>

                    {marcador.tipo === 'lote' ? (
                      <div>Código de lote: {marcador.lote}</div>
                    ) : null}

                    <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                      {marcador.registros.map((registro, indice) => (
                        <div
                          key={registro.id}
                          className="consulta-mapa-popup-observacion"
                          style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: '#f8fafc',
                          }}
                        >
                          <div>
                            <strong>
                              {marcador.tipo === 'lote'
                                ? `Registro ${indice + 1}`
                                : `Secuencia ${registro.secuencia}`}
                            </strong>
                            {marcador.tipo === 'lote'
                              ? ` · Correlativo interno ${indice + 1}`
                              : ''}
                            {' '}
                            · ID {registro.idNotificacion || registro.id}
                          </div>

                          <div>Lote: {registro.codigoLote || '--'}</div>
                          <div>Código: {registro.codigo || '--'}</div>
                          <div>Hora: {registro.hora || '--'}</div>
                          <div>Tipo: {registro.esNoUrbana ? 'No urbana' : 'Urbana'}</div>

                          {registro.observacion ? (
                            <div>{registro.observacion}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
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