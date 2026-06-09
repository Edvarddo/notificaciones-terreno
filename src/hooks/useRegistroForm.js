import { useState } from 'react'
import { normalizarIdNotificacion } from '../utils/validation'

function useRegistroForm() {
  const [idNotificacion, setIdNotificacionState] = useState('')
  const [codigo, setCodigoState] = useState('')
  const [observacion, setObservacion] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [esNoUrbana, setEsNoUrbana] = useState(false)
  const [mostraTribunal, setMostraTribunal] = useState(false)
  const [rit, setRit] = useState('')
  const [año, setAño] = useState('')
  const [a1Caso, setA1Caso] = useState('')
  const [a1Valor1, setA1Valor1] = useState('')
  const [a1Valor2, setA1Valor2] = useState('')
  const [a3Caso, setA3Caso] = useState('')

  const A1_CASOS = {
    SALTO: {
      etiqueta: 'Salto de numeración desde XXXX hasta YYYY',
      requiere: 2,
      build: (valor1, valor2) => {
        if (valor1 && valor2) return `Salto de numeración desde ${valor1} hasta ${valor2}.`
        if (valor1) return `Salto de numeración desde ${valor1}.`
        return 'Salto de numeración.'
      },
    },
    COMIENZA: {
      etiqueta: 'La numeración comienza en XXXX',
      requiere: 1,
      build: (v1) => (v1 ? `La numeración comienza en ${v1}.` : 'Salto de numeración comienza en un valor determinado.'),
    },
    TERMINA: {
      etiqueta: 'La numeración termina en YYYY',
      requiere: 1,
      build: (v1) => (v1 ? `La numeración termina en ${v1}.` : 'Salto numeración termina en un valor determinado.'),
    },
    ENTRE: {
      etiqueta: 'La numeración está entre XXXX y YYYY',
      requiere: 2,
      build: (v1, v2) => {
        if (v1 && v2) return `La numeración está entre ${v1} y ${v2}.`
        if (v1) return `La numeración a partir de ${v1}.`
        return 'La numeración en un rango no especificado.'
      },
    },
    SIN_ORDEN: {
      etiqueta: 'Numeración no definida en el área',
      requiere: 0,
      build: () =>
        'La numeración no se encuentra y no existe un orden definido en el área.',
    },
    SECTOR_TOMAS: {
      etiqueta: 'Sector tomas, sin nombre ni numeración a la vista',
      requiere: 0,
      build: () => 'Sector de tomas detectado; no hay nombre de calle ni numeración visible.',
    },
    SECTOR_INDUSTRIAL: {
      etiqueta: 'Sector industrial sin nombre ni numeración a la vista',
      requiere: 0,
      build: () => 'Sector industrial sin identificación ni numeración visible.',
    },
  }

  const A3_CASOS = {
    FALTA_NUMERO_CASA: {
      etiqueta: 'Falta número de casa',
      requiere: 0,
      build: () => 'Falta número de casa en la dirección proporcionada.',
    },
    FALTA_DPTO_BLOCK: {
      etiqueta: 'Falta número de departamento y block',
      requiere: 0,
      build: () => 'Falta número de departamento y block en la dirección proporcionada.',
    },
  }

const OBSERVACIONES_SUGERIDAS = {
  // Realizadas
  D2: '.',
  D4: '.',
  E1: 'Se notifica personalmente en terreno',

  // Dirección
  A2: '.',
  A4: '.',
  A5: '.',

  // Búsqueda
  B3: 'Se deja aviso',
  B5: '.',
  B7: 'Se deja aviso',
  B10: '.',

  // Negativas / otros
  B2: '.',
  B6: '.',
  B8: '.',
  B9: '.',
  F4: '.',
}

  // Añadir B7 y A1 (A1 como opciones)
  OBSERVACIONES_SUGERIDAS.B7 = 'Se deja aviso'
  OBSERVACIONES_SUGERIDAS.A1 = Object.values(A1_CASOS).map((caso) => caso.etiqueta)
  OBSERVACIONES_SUGERIDAS.A3 = Object.values(A3_CASOS).map((caso) => caso.etiqueta)

  const obtenerObservacionSugerida = (codigoValue) => {
    return OBSERVACIONES_SUGERIDAS[codigoValue.trim().toUpperCase()] || ''
  }

const setCodigo = (nuevoCodigo) => {
  const codigoLimpio = String(nuevoCodigo ?? '').trim().toUpperCase()
  const sugerenciaNueva = obtenerObservacionSugerida(codigoLimpio)

  setCodigoState(codigoLimpio)

  setA1Caso('')
  setA1Valor1('')
  setA1Valor2('')
  setA3Caso('')

  if (codigoLimpio === 'A1') {
    const casoInicial = 'SALTO'
    setA1Caso(casoInicial)
    setObservacion(A1_CASOS[casoInicial].build('', ''))
    return
  }

  if (codigoLimpio === 'A3') {
    const casoInicial = 'FALTA_NUMERO_CASA'
    setA3Caso(casoInicial)
    setObservacion(A3_CASOS[casoInicial].build())
    return
  }

  setObservacion(sugerenciaNueva || '')
}

  const construirObservacionA1 = (caso, valor1, valor2) => {
    const casoActual = A1_CASOS[caso]
    if (!casoActual) return ''
    return casoActual.build(valor1, valor2)
  }

  const construirObservacionA3 = (caso) => {
    const casoActual = A3_CASOS[caso]
    if (!casoActual) return ''
    return casoActual.build()
  }

  const handleA1CasoChange = (caso) => {
    const anterior = construirObservacionA1(a1Caso, a1Valor1, a1Valor2)
    setA1Caso(caso)
    const nueva = construirObservacionA1(caso, '', '')
    if (!observacion.trim() || observacion === anterior) {
      setObservacion(nueva)
    }
  }

  const handleA3CasoChange = (caso) => {
    const anterior = construirObservacionA3(a3Caso)
    setA3Caso(caso)
    const nueva = construirObservacionA3(caso)
    if (!observacion.trim() || observacion === anterior) {
      setObservacion(nueva)
    }
  }

  const handleA1Valor1Change = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Caso, a1Valor1, a1Valor2)
    setA1Valor1(limpio)
    const nueva = construirObservacionA1(a1Caso, limpio, a1Valor2)
    if (!observacion.trim() || observacion === anterior) {
      setObservacion(nueva)
    }
  }

  const handleA1Valor2Change = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Caso, a1Valor1, a1Valor2)
    setA1Valor2(limpio)
    const nueva = construirObservacionA1(a1Caso, a1Valor1, limpio)
    if (!observacion.trim() || observacion === anterior) {
      setObservacion(nueva)
    }
  }

  const limpiarFormulario = () => {
    setIdNotificacionState('')
    setCodigoState('')
    setObservacion('')
    setComentarios('')
    setEsNoUrbana(false)
    setMostraTribunal(false)
    setRit('')
    setAño('')
    setA1Caso('')
    setA1Valor1('')
    setA1Valor2('')
  }

  const handleCodigoManualChange = (e) => {
    const limpio = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
    setCodigo(limpio.toUpperCase())
  }

  const handleIdNotificacionChange = (valor) => {
    setIdNotificacionState(normalizarIdNotificacion(valor))
  }

  return {
    idNotificacion,
    codigo,
    observacion,
    comentarios,
    esNoUrbana,
    mostraTribunal,
    rit,
    año,
    a1Caso,
    a1Valor1,
    a1Valor2,
    a3Caso,
    a3Casos: A3_CASOS,
    handleA3CasoChange,
    a1Casos: A1_CASOS,
    handleA1CasoChange,
    handleA1Valor1Change,
    handleA1Valor2Change,
    setIdNotificacion: handleIdNotificacionChange,
    setCodigo,
    setObservacion,
    setComentarios,
    setEsNoUrbana,
    setMostraTribunal,
    setRit,
    setAño,
    limpiarFormulario,
    handleCodigoManualChange,
  }
}

export default useRegistroForm
