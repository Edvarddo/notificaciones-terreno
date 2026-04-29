import { useState } from 'react'

function useRegistroForm() {
  const [idNotificacion, setIdNotificacion] = useState('')
  const [codigo, setCodigoState] = useState('')
  const [observacion, setObservacion] = useState('')
  const [comentarios, setComentarios] = useState('')
  const [esNoUrbana, setEsNoUrbana] = useState(false)

  const OBSERVACIONES_SUGERIDAS = {
    D2: '.',
    E1: 'Se notifica personalmente en terreno',
    B3: 'Se deja aviso',
  }

  const obtenerObservacionSugerida = (codigoValue) => {
    return OBSERVACIONES_SUGERIDAS[codigoValue.trim().toUpperCase()] || ''
  }

  const setCodigo = (nuevoCodigo) => {
    const codigoLimpio = String(nuevoCodigo ?? '').trim().toUpperCase()
    const sugerenciaActual = obtenerObservacionSugerida(codigo)
    const sugerenciaNueva = obtenerObservacionSugerida(codigoLimpio)

    setCodigoState(codigoLimpio)

    if (sugerenciaNueva) {
      if (!observacion.trim() || observacion === sugerenciaActual) {
        setObservacion(sugerenciaNueva)
      }
    } else if (observacion.trim() && observacion === sugerenciaActual) {
      setObservacion('')
    }
  }

  const limpiarFormulario = () => {
    setIdNotificacion('')
    setCodigoState('')
    setObservacion('')
    setComentarios('')
    setEsNoUrbana(false)
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
    setIdNotificacion,
    setCodigo,
    setObservacion,
    setComentarios,
    setEsNoUrbana,
    limpiarFormulario,
    handleCodigoManualChange,
  }
}

export default useRegistroForm