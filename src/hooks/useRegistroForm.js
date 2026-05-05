import { useState } from 'react'

function useRegistroForm() {
  const [idNotificacion, setIdNotificacion] = useState('')
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

  const A1_CASOS = {
    SALTO: {
      etiqueta: 'Salto de numeración desde XXXX hasta YYYY',
      requiere: 2,
      build: (valor1, valor2) => {
        if (valor1 && valor2) return `Se constata salto de numeración desde ${valor1} hasta ${valor2}.`
        if (valor1) return `Se constata salto de numeración desde ${valor1}.`
        return 'Se constata salto de numeración.'
      },
    },
    INFERIOR: {
      etiqueta: 'Numeración inferior a XXXX',
      requiere: 1,
      build: (valor1) => {
        if (valor1) {
          return `Se constata numeración de referencia ${valor1}; se busca una numeración inferior a esa.`
        }
        return 'Se constata numeración de referencia para búsqueda inferior.'
      },
    },
    SUPERIOR: {
      etiqueta: 'Numeración superior a XXXX',
      requiere: 1,
      build: (valor1) => {
        if (valor1) {
          return `Se constata numeración de referencia ${valor1}; se busca una numeración superior a esa.`
        }
        return 'Se constata numeración de referencia para búsqueda superior.'
      },
    },
    SIN_ORDEN: {
      etiqueta: 'Numeración no definida en el área',
      requiere: 0,
      build: () =>
        'Se constata que la numeración no se encuentra y no existe un orden definido en el área.',
    },
  }

  const OBSERVACIONES_SUGERIDAS = {
    D2: '.',
    E1: 'Se notifica personalmente en terreno',
    B3: 'Se deja aviso',
  }

  // Añadir B7 y A1 (A1 como opciones)
  OBSERVACIONES_SUGERIDAS.B7 = 'Se deja aviso'
  OBSERVACIONES_SUGERIDAS.A1 = Object.values(A1_CASOS).map((caso) => caso.etiqueta)

  const obtenerObservacionSugerida = (codigoValue) => {
    return OBSERVACIONES_SUGERIDAS[codigoValue.trim().toUpperCase()] || ''
  }

  const setCodigo = (nuevoCodigo) => {
    const codigoLimpio = String(nuevoCodigo ?? '').trim().toUpperCase()
    const sugerenciaActual = obtenerObservacionSugerida(codigo)
    const sugerenciaNueva = obtenerObservacionSugerida(codigoLimpio)

    const sugerenciaActualNorm = Array.isArray(sugerenciaActual) ? (sugerenciaActual[0] || '') : sugerenciaActual
    setCodigoState(codigoLimpio)

    if (sugerenciaNueva) {
      if (Array.isArray(sugerenciaNueva)) {
        const casoInicial = 'SALTO'
        const textoInicial = A1_CASOS[casoInicial].build('', '')
        if (!observacion.trim() || observacion === sugerenciaActualNorm) {
          setObservacion(textoInicial)
        }
        setA1Caso(casoInicial)
        setA1Valor1('')
        setA1Valor2('')
      } else {
        if (!observacion.trim() || observacion === sugerenciaActualNorm) {
          setObservacion(sugerenciaNueva)
        }
        setA1Caso('')
        setA1Valor1('')
        setA1Valor2('')
      }
    } else if (observacion.trim() && observacion === sugerenciaActualNorm) {
      setObservacion('')
    }
  }

  const construirObservacionA1 = (caso, valor1, valor2) => {
    const casoActual = A1_CASOS[caso]
    if (!casoActual) return ''
    return casoActual.build(valor1, valor2)
  }

  const handleA1CasoChange = (caso) => {
    const anterior = construirObservacionA1(a1Caso, a1Valor1, a1Valor2)
    setA1Caso(caso)
    const nueva = construirObservacionA1(caso, '', '')
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
    setIdNotificacion('')
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
    a1Casos: A1_CASOS,
    handleA1CasoChange,
    handleA1Valor1Change,
    handleA1Valor2Change,
    setIdNotificacion,
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