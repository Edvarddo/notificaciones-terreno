import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import buffer from '@turf/buffer'
import { point, polygon } from '@turf/helpers'

export const POLIGONO_URBANO = [
  [-68.94833366845792, -22.462167407682955],
  [-68.94603340210834, -22.466560385680296],
  [-68.94343441206918, -22.470097024145417],
  [-68.94222533018157, -22.472488955243094],
  [-68.94163785393769, -22.473499487906903],
  [-68.94060614494983, -22.473841116311654],
  [-68.94054263944574, -22.474516031138304],
  [-68.94023764753368, -22.475185762392528],
  [-68.93941219857908, -22.47630819414691],
  [-68.9390957504212, -22.478030584563555],
  [-68.93842551218802, -22.48069275497005],
  [-68.9357808955523, -22.4821334945744],
  [-68.93517786126012, -22.482286271117594],
  [-68.93502464177084, -22.48293426300707],
  [-68.93464163857112, -22.483770402970244],
  [-68.93427308220834, -22.483768427145087],
  [-68.93388538479023, -22.483695706906456],
  [-68.93383735005996, -22.484080849417026],
  [-68.9333483260437, -22.484875373432402],
  [-68.93304375100422, -22.485144810006048],
  [-68.93286317936972, -22.485194593046444],
  [-68.93265432362091, -22.485165974354985],
  [-68.93241047155747, -22.485046784764894],
  [-68.93223025875172, -22.484992929925205],
  [-68.93196872911699, -22.484893340776164],
  [-68.93164356022385, -22.484806818558354],
  [-68.93071057814247, -22.48442152884786],
  [-68.93030857144896, -22.4841165807697],
  [-68.93010756810222, -22.483964106701006],
  [-68.92994899092777, -22.483837766745964],
  [-68.929693187109, -22.483682025740183],
  [-68.9294373832902, -22.483558952432652],
  [-68.92926643181526, -22.48346201324814],
  [-68.92896820182496, -22.483646016953458],
  [-68.925451279895, -22.487775509238084],
  [-68.92491979688909, -22.488446809522276],
  [-68.92403158827817, -22.489574116414452],
  [-68.92152701522274, -22.490806103716466],
  [-68.92057386891464, -22.49117500052502],
  [-68.91978091689171, -22.490480917099177],
  [-68.91895408652533, -22.489754423465193],
  [-68.91809210169814, -22.489005777040692],
  [-68.91636813204377, -22.487544909848133],
  [-68.91288077082947, -22.484477482105433],
  [-68.90598489221189, -22.47845190676297],
  [-68.90564891097088, -22.478153366433993],
  [-68.90525379687166, -22.47783661273125],
  [-68.90462125629618, -22.477239532231287],
  [-68.90347444086277, -22.476263933720066],
  [-68.90129907571225, -22.474312738542075],
  [-68.90065279573369, -22.473524422238178],
  [-68.90006564861332, -22.47282717611126],
  [-68.89951792339896, -22.47212993066885],
  [-68.89912788580762, -22.47128697152659],
  [-68.89875039261376, -22.469335847750457],
  [-68.89863531100875, -22.4681982087817],
  [-68.89879618274418, -22.467461293432493],
  [-68.90004434099949, -22.46520423279793],
  [-68.90022099619654, -22.464429414074456],
  [-68.90023996377063, -22.46380031709753],
  [-68.89998223462625, -22.462378178185016],
  [-68.8995456201484, -22.45964318362349],
  [-68.89908929471783, -22.4570356867354],
  [-68.89882171009708, -22.4560598294006],
  [-68.89855412547634, -22.455083972065808],
  [-68.89803628782026, -22.45328361000083],
  [-68.89759729397569, -22.451665410690012],
  [-68.89762601011883, -22.449303420434234],
  [-68.89795344394227, -22.44803089013048],
  [-68.89844615884638, -22.4468674720162],
  [-68.89915137799674, -22.445769521830147],
  [-68.9000218782285, -22.444791597284947],
  [-68.90087881295936, -22.44392865479768],
  [-68.90192464035503, -22.443022064240566],
  [-68.90378017931604, -22.44129617356597],
  [-68.90424701550447, -22.440852425554986],
  [-68.90476107485844, -22.440397765183633],
  [-68.90578919356638, -22.439488443719924],
  [-68.90772737306838, -22.437735270755233],
  [-68.9097163378829, -22.43589977249816],
  [-68.9107403347683, -22.434987479160974],
  [-68.911835166402, -22.434227957242772],
  [-68.91570089957526, -22.432898946191713],
  [-68.91648415136457, -22.432921311028686],
  [-68.9171305256178, -22.432740648677136],
  [-68.91825320108236, -22.432379323791032],
  [-68.91940776524267, -22.432165377347378],
  [-68.92049855201151, -22.43179422692856],
  [-68.92172220834483, -22.431599931338187],
  [-68.92269075511486, -22.43124843114723],
  [-68.9248829582182, -22.430702635365904],
  [-68.92514164889829, -22.43169636713969],
  [-68.92531351249906, -22.43234061136559],
  [-68.92563419001038, -22.432572195520898],
  [-68.92713734653186, -22.43248145626889],
  [-68.93031388984723, -22.433682521950978],
  [-68.93188377264006, -22.434266059233625],
  [-68.93331809036296, -22.437584949354303],
  [-68.93596821788708, -22.43736088402153],
  [-68.93658138777452, -22.437548469966785],
  [-68.93719455766198, -22.437961854809572],
  [-68.93851079912238, -22.439110080634194],
  [-68.94528894406162, -22.443977806500428],
  [-68.94666264590234, -22.44399893456172],
  [-68.95407104754099, -22.452780247676998],
  [-68.95322211781902, -22.45523054192286],
  [-68.95012877818415, -22.453956245557237],
  [-68.95013973139766, -22.454817230928953],
  [-68.95007785917697, -22.45600042346038],
  [-68.95152220489148, -22.456273285527672],
  [-68.94833366845792, -22.462167407682955],
]

const MARGEN_POLIGONO_METROS = 25
const MARGEN_PRECISO_METROS = 10
const MARGEN_INTERMEDIO_METROS = 15
const MARGEN_BAJA_PRECISION_METROS = 20
const UMBRAL_PRECISION_ALTA_METROS = 10
const UMBRAL_PRECISION_MEDIA_METROS = 20
const UMBRAL_PRECISION_BAJA_METROS = 30
const ULTIMA_POSICION_KEY = 'notificaciones-terreno-ultima-posicion-gps'
const ULTIMA_POSICION_TTL_MS = 30 * 60 * 1000


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

  // console.log('[geo] comparacion Turf', {
  //   punto: [lng, lat],
  //   dentro,
  //   modo: dentro ? 'urbano' : 'rural',
  //   margenMetros: MARGEN_POLIGONO_METROS,
  // })

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

function guardarUltimaPosicionGps({ latitud, longitud, precision }) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return

    window.localStorage.setItem(
      ULTIMA_POSICION_KEY,
      JSON.stringify({
        latitud,
        longitud,
        precision,
        timestamp: Date.now(),
      })
    )
  } catch (error) {
    console.warn('[geo] no se pudo guardar la ultima posicion GPS', error)
  }
}

function leerUltimaPosicionGps() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null

    const raw = window.localStorage.getItem(ULTIMA_POSICION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!Number.isFinite(parsed?.latitud) || !Number.isFinite(parsed?.longitud)) return null

    const timestamp = Number(parsed?.timestamp || 0)
    if (!timestamp || Date.now() - timestamp > ULTIMA_POSICION_TTL_MS) return null

    return {
      latitud: Number(parsed.latitud),
      longitud: Number(parsed.longitud),
      precision: Number(parsed.precision || NaN),
      timestamp,
    }
  } catch (error) {
    console.warn('[geo] no se pudo leer la ultima posicion GPS', error)
    return null
  }
}

async function obtenerPosicionConReintentos() {
  const intentos = [
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
  ]

  let ultimoError = null

  for (const opciones of intentos) {
    try {
      return await obtenerPosicionActual(opciones)
    } catch (error) {
      ultimoError = error
      console.warn('[geo] intento GPS fallido', {
        opciones,
        error: error?.message || error,
      })
    }
  }

  throw ultimoError || new Error('No fue posible obtener la geolocalización')
}

export async function determinarSiEsNoUrbanaDesdeGPS(esNoUrbanaManual = false) {
  try {

    const posicion = await obtenerPosicionConReintentos()
    console.log('[GPS RAW]', {
      timestamp: posicion.timestamp,
      edadMs: Date.now() - posicion.timestamp,
      accuracy: posicion.coords.accuracy,
      latitud: posicion.coords.latitude,
      longitud: posicion.coords.longitude,
    })
    const lng = posicion.coords.longitude
    const lat = posicion.coords.latitude
    const precisionGps = posicion.coords.accuracy
    const margenAplicado = calcularMargenSegunPrecision(precisionGps)
    const poligonoUrbano = obtenerPoligonoConMargen(margenAplicado)
    const esUrbana = puntoEnPoligono([lng, lat], poligonoUrbano)

    guardarUltimaPosicionGps({ latitud: lat, longitud: lng, precision: precisionGps })

    // console.log('[geo] ubicacion GPS', {
    //   latitud: lat,
    //   longitud: lng,
    //   precision: precisionGps,
    //   esUrbana,
    //   esNoUrbana: !esUrbana,
    //   poligono: 'POLIGONO_URBANO',
    //   margenMetros: margenAplicado,
    // })

    return {
      latitud: lat,
      longitud: lng,
      es_no_urbana: !esUrbana,
      fuente: 'gps',
    }
  } catch (error) {
    console.warn('[geo] GPS no disponible, intentando ultima posicion conocida', error?.message || error)

    const ultimaPosicion = leerUltimaPosicionGps()
    if (ultimaPosicion) {
      const margenAplicado = calcularMargenSegunPrecision(ultimaPosicion.precision)
      const poligonoUrbano = obtenerPoligonoConMargen(margenAplicado)
      const esUrbana = puntoEnPoligono([ultimaPosicion.longitud, ultimaPosicion.latitud], poligonoUrbano)

      console.log('[geo] usando ultima posicion GPS conocida', {
        latitud: ultimaPosicion.latitud,
        longitud: ultimaPosicion.longitud,
        precision: ultimaPosicion.precision,
        esUrbana,
        esNoUrbana: !esUrbana,
        fuente: 'gps-cache',
      })

      return {
        latitud: ultimaPosicion.latitud,
        longitud: ultimaPosicion.longitud,
        es_no_urbana: !esUrbana,
        fuente: 'gps-cache',
      }
    }

    return clasificarPorFallbackManual(esNoUrbanaManual)
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