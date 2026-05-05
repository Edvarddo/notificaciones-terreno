import { Fragment, useEffect, useMemo } from 'react'
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
  const lote = String(registro.codigo_lote ?? '').trim().toUpperCase()
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

function crearIconoNumero(numero, esNoUrbana, codigoLote) {
  return divIcon({
    className: 'consulta-mapa-divicon',
    html: `
      <div class="consulta-mapa-marker ${esNoUrbana ? 'marker-rural' : 'marker-urbana'}">
        <span class="consulta-mapa-marker-numero">${numero}</span>
        <span class="consulta-mapa-marker-lote">${codigoLote || 'SIN LOTE'}</span>
      </div>
    `,
    iconSize: [52, 58],
    iconAnchor: [26, 52],
    popupAnchor: [0, -48],
  })
}

export default function ConsultaMapa({ registros }) {
  const puntos = useMemo(() => {
    const filtrados = (registros || [])
      .filter((registro) => esCoordenadaValida(Number(registro.latitud)) && esCoordenadaValida(Number(registro.longitud)))
      .map((registro) => ({
        id: registro.id,
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

    const puntosOrdenados = [...filtrados].sort((a, b) => a.marcaTemporal - b.marcaTemporal)
    const lotesConNumero = new Map()
    const lotesConConteo = new Map()
    let correlativo = 1

    return puntosOrdenados.map((punto) => {
      const claveLote = obtenerClaveLote(punto)
      let numero = lotesConNumero.get(claveLote)
      const ocurrenciaLote = lotesConConteo.get(claveLote) || 0

      if (!numero) {
        numero = correlativo
        lotesConNumero.set(claveLote, numero)
        correlativo += 1
      }

      lotesConConteo.set(claveLote, ocurrenciaLote + 1)
      const [latitudVisual, longitudVisual] = desplazarDuplicado(punto.latitud, punto.longitud, ocurrenciaLote)

      return {
        ...punto,
        numero,
        claveLote,
        ocurrenciaLote,
        latitudVisual,
        longitudVisual,
      }
    })
  }, [registros])

  const centro = useMemo(() => {
    if (puntos.length === 0) {
      return [-22.4638, -68.9439]
    }

    const totalLat = puntos.reduce((acc, punto) => acc + punto.latitud, 0)
    const totalLng = puntos.reduce((acc, punto) => acc + punto.longitud, 0)
    return [totalLat / puntos.length, totalLng / puntos.length]
  }, [puntos])

  const tienePuntos = puntos.length > 0

  const positions = useMemo(() => {
    const polygonLatLngs = POLIGONO_URBANO.map(([lng, lat]) => [lat, lng])
    const puntosLatLngs = puntos.map((punto) => [punto.latitudVisual, punto.longitudVisual])
    return { polygonLatLngs, puntosLatLngs }
  }, [puntos])

  const segmentosTraza = useMemo(() => {
    if (puntos.length < 2) return []

    return puntos.slice(1).map((puntoActual, indice) => {
      const puntoAnterior = puntos[indice]
      const color = puntoActual.esNoUrbana ? '#dc2626' : '#0284c7'

      return {
        id: `${puntoAnterior.id}-${puntoActual.id}-${indice}`,
        posiciones: [
          [puntoAnterior.latitudVisual, puntoAnterior.longitudVisual],
          [puntoActual.latitudVisual, puntoActual.longitudVisual],
        ],
        color,
      }
    })
  }, [puntos])

  const bounds = useMemo(() => {
    const puntosBounds = puntos.map((punto) => [punto.latitudVisual, punto.longitudVisual])
    const coords = [...POLIGONO_URBANO.map(([lng, lat]) => [lat, lng]), ...puntosBounds]
    return coords.length > 0 ? latLngBounds(coords) : null
  }, [puntos])

  function AjustarVista() {
    const map = useMap()

    useEffect(() => {
      if (!tienePuntos || !bounds) return
      map.fitBounds(bounds, { padding: [20, 20] })
    }, [map, tienePuntos, bounds])

    return null
  }

  return (
    <section className="consulta-mapa-panel">
      <div className="consulta-mapa-header">
        <div>
          <p className="consulta-kicker">Mapa geográfico</p>
          <h3>Coordenadas y polígono urbano</h3>
        </div>
        <div className="consulta-mapa-leyenda">
          <span className="leyenda-item"><i className="leyenda-color leyenda-urbana" /> Urbana</span>
          <span className="leyenda-item"><i className="leyenda-color leyenda-rural" /> Rural</span>
        </div>
      </div>

      <div className="consulta-mapa-wrap">
        {tienePuntos ? (
          <MapContainer center={centro} zoom={13} scrollWheelZoom className="consulta-mapa">
            <AjustarVista />
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polygon positions={positions.polygonLatLngs} pathOptions={{ color: '#0b3c5d', weight: 2, fillColor: '#0b3c5d', fillOpacity: 0.12 }} />
            {segmentosTraza.length > 0 ? (
              <>
                {segmentosTraza.map((segmento) => (
                  <Fragment key={segmento.id}>
                    <Polyline
                      key={`${segmento.id}-halo`}
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
                      key={segmento.id}
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
              </>
            ) : null}
            {puntos.map((punto) => (
              <Marker
                key={punto.id}
                position={[punto.latitudVisual, punto.longitudVisual]}
                icon={crearIconoNumero(punto.numero, punto.esNoUrbana, punto.codigoLote)}
              >
                <Popup>
                  <div className="consulta-mapa-popup">
                    <strong>Secuencia {punto.numero}</strong>
                    <strong>{punto.idNotificacion || 'Sin ID'}</strong>
                    <div>Lote: {punto.codigoLote || 'Sin lote'}</div>
                    {punto.ocurrenciaLote > 0 ? <div>Repetido en lote: #{punto.ocurrenciaLote + 1}</div> : null}
                    <div>Código: {punto.codigo || '--'}</div>
                    <div>Fecha: {punto.fecha || '--'}</div>
                    <div>Hora: {punto.hora || '--'}</div>
                    <div>Tipo: {punto.esNoUrbana ? 'No urbana' : 'Urbana'}</div>
                    <div>Lat: {punto.latitud.toFixed(6)}</div>
                    <div>Lng: {punto.longitud.toFixed(6)}</div>
                    {punto.observacion ? <div className="consulta-mapa-popup-observacion">{punto.observacion}</div> : null}
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
