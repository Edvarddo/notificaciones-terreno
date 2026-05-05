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
  const [a1Option, setA1Option] = useState('')
  const [a1Desde, setA1Desde] = useState('')
  const [a1Hasta, setA1Hasta] = useState('')

  const OBSERVACIONES_SUGERIDAS = {
    D2: '.',
    E1: 'Se notifica personalmente en terreno',
    B3: 'Se deja aviso',
  }

  // Añadir B7 y A1 (A1 como opciones)
  OBSERVACIONES_SUGERIDAS.B7 = 'Se deja aviso'
  OBSERVACIONES_SUGERIDAS.A1 = [
    'RANGO DE DIRECCIONES',
    'COMIENZA EL RANGO DE NUMERACIÓN DESDE',
    'TERMINA EL RANGO DE NUMERACIÓN EN',
  ]

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
        const primera = sugerenciaNueva[0] || ''
        if (!observacion.trim() || observacion === sugerenciaActualNorm) {
          setObservacion(primera)
        }
        setA1Option(primera)
        setA1Desde('')
        setA1Hasta('')
      } else {
        if (!observacion.trim() || observacion === sugerenciaActualNorm) {
          setObservacion(sugerenciaNueva)
        }
        setA1Option('')
        setA1Desde('')
        setA1Hasta('')
      }
    } else if (observacion.trim() && observacion === sugerenciaActualNorm) {
      setObservacion('')
    }
  }

  const construirObservacionA1 = (option, desde, hasta) => {
    if (!option) return ''
    if (option === 'RANGO DE DIRECCIONES') {
      if (desde && hasta) return `RANGO DE DIRECCIONES: ${desde} - ${hasta}`
      if (desde) return `RANGO DE DIRECCIONES desde ${desde}`
      if (hasta) return `RANGO DE DIRECCIONES hasta ${hasta}`
      return 'RANGO DE DIRECCIONES'
    }
    if (option === 'COMIENZA EL RANGO DE NUMERACIÓN DESDE') {
      return desde ? `COMIENZA EL RANGO DE NUMERACIÓN DESDE ${desde}` : 'COMIENZA EL RANGO DE NUMERACIÓN DESDE'
    }
    if (option === 'TERMINA EL RANGO DE NUMERACIÓN EN') {
      return hasta ? `TERMINA EL RANGO DE NUMERACIÓN EN ${hasta}` : 'TERMINA EL RANGO DE NUMERACIÓN EN'
    }
    return option
  }

  const handleA1OptionChange = (option) => {
    const anterior = construirObservacionA1(a1Option, a1Desde, a1Hasta)
    setA1Option(option)
    const nueva = construirObservacionA1(option, a1Desde, a1Hasta)
    if (!observacion.trim() || observacion === anterior) {
      setObservacion(nueva)
    }
  }

  const handleA1DesdeChange = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Option, a1Desde, a1Hasta)
    setA1Desde(limpio)
    const nueva = construirObservacionA1(a1Option, limpio, a1Hasta)
    if (!observacion.trim() || observacion === anterior) {
      setObservacion(nueva)
    }
  }

  const handleA1HastaChange = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Option, a1Desde, a1Hasta)
    setA1Hasta(limpio)
    const nueva = construirObservacionA1(a1Option, a1Desde, limpio)
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