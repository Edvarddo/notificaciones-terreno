import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import buffer from '@turf/buffer'
import { point, polygon } from '@turf/helpers'

const POLIGONO_URBANO = [
  [-68.94832338474046, -22.462238753570077],
  [-68.9461885173666, -22.466489832045426],
  [-68.9414909732049, -22.46538072861587],
  [-68.94085524117946, -22.46719417811353],
  [-68.94035261547114, -22.468659900232325],
  [-68.94121714605407, -22.4774151802048],
  [-68.93841576758739, -22.480814520600916],
  [-68.93396384638048, -22.48442636539957],
  [-68.93273753883211, -22.48536419735015],
  [-68.93062408866608, -22.484639352862487],
  [-68.92172096560523, -22.49160529460667],
  [-68.91941208163772, -22.490937638078705],
  [-68.90553152225019, -22.478282959624067],
  [-68.89640755865672, -22.469789480080905],
  [-68.89835913934881, -22.46438201286786],
  [-68.89759822908115, -22.45482639673648],
  [-68.89671520258138, -22.44935561912922],
  [-68.8991003753739, -22.444009200343444],
  [-68.91774435871564, -22.429076896344526],
  [-68.92513723136929, -22.429105485104515],
  [-68.93319172900003, -22.43567022981165],
  [-68.9387831223664, -22.438850219634716],
  [-68.94563460924267, -22.44393540626865],
  [-68.94673171905639, -22.444105688879304],
  [-68.95414012069504, -22.452887001994583],
  [-68.95329119097308, -22.455337296240444],
  [-68.95091908267675, -22.45435556489295],
  [-68.95172266138091, -22.45597873033266],
  [-68.94832338474046, -22.462238753570077],
]

const MARGEN_POLIGONO_METROS = 25
const MARGEN_PRECISO_METROS = 10
const MARGEN_INTERMEDIO_METROS = 15
const MARGEN_BAJA_PRECISION_METROS = 20
const UMBRAL_PRECISION_ALTA_METROS = 10
const UMBRAL_PRECISION_MEDIA_METROS = 20
const UMBRAL_PRECISION_BAJA_METROS = 30

const obtenerPoligonoConMargen = (margenMetros) => {
  try {
    return buffer(polygon([POLIGONO_URBANO]), margenMetros / 1000, {
      units: 'kilometers',
    })
  } catch (error) {
    console.warn('[geo] no se pudo crear el buffer del poligono, usando original', error)
    return polygon([POLIGONO_URBANO])
  }
}

function calcularMargenSegunPrecision(precisionGpsMetros) {
  if (!Number.isFinite(precisionGpsMetros)) {
    return MARGEN_POLIGONO_METROS
  }

  if (precisionGpsMetros <= UMBRAL_PRECISION_ALTA_METROS) {
    return MARGEN_PRECISO_METROS
  }

  if (precisionGpsMetros <= UMBRAL_PRECISION_MEDIA_METROS) {
    return MARGEN_INTERMEDIO_METROS
  }

  if (precisionGpsMetros <= UMBRAL_PRECISION_BAJA_METROS) {
    return MARGEN_BAJA_PRECISION_METROS
  }

  return MARGEN_POLIGONO_METROS
}

function puntoEnPoligono([lng, lat], poligono) {
  const turfPoint = point([lng, lat])
  const dentro = booleanPointInPolygon(turfPoint, poligono, { ignoreBoundary: false })

  console.log('[geo] comparacion Turf', {
    punto: [lng, lat],
    dentro,
    modo: dentro ? 'urbano' : 'rural',
    margenMetros: MARGEN_POLIGONO_METROS,
  })

  return dentro
}

function obtenerPosicionActual(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada por este navegador'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

export async function determinarSiEsNoUrbanaDesdeGPS() {
  const posicion = await obtenerPosicionActual()
  const lng = posicion.coords.longitude
  const lat = posicion.coords.latitude
  const precisionGps = posicion.coords.accuracy
  const margenAplicado = calcularMargenSegunPrecision(precisionGps)
  const poligonoUrbano = obtenerPoligonoConMargen(margenAplicado)
  const esUrbana = puntoEnPoligono([lng, lat], poligonoUrbano)

  console.log('[geo] ubicacion GPS', {
    latitud: lat,
    longitud: lng,
    precision: precisionGps,
    esUrbana,
    esNoUrbana: !esUrbana,
    poligono: 'POLIGONO_URBANO',
    margenMetros: margenAplicado,
  })

  return {
    latitud: lat,
    longitud: lng,
    es_no_urbana: !esUrbana,
    fuente: 'gps',
  }
}

export function clasificarPorFallbackManual(esNoUrbanaManual) {
  console.log('[geo] fallback manual', {
    esNoUrbanaManual: Boolean(esNoUrbanaManual),
  })

  return {
    latitud: null,
    longitud: null,
    es_no_urbana: Boolean(esNoUrbanaManual),
    fuente: 'manual',
  }
}