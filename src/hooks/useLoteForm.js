import { useRef, useState } from 'react'

function useLoteForm() {
  const [idsTemporales, setIdsTemporales] = useState([])
  const idsTemporalesRef = useRef([])
  const [horaLote, setHoraLote] = useState('')
  const [codigoLote, setCodigoLoteState] = useState('')
  const [observacionLote, setObservacionLote] = useState('')
  const [esNoUrbanaLote, setEsNoUrbanaLote] = useState(false)
  const [mostraTribunalLote, setMostraTribunalLote] = useState(false)
  const [ritLote, setRitLote] = useState('')
  const [añoLote, setAñoLote] = useState('')

  const OBSERVACIONES_SUGERIDAS = {
    D2: '.',
    E1: 'Se notifica personalmente en terreno',
    B3: 'Se deja aviso',
  }

  const obtenerObservacionSugerida = (codigoValue) => {
    return OBSERVACIONES_SUGERIDAS[codigoValue.trim().toUpperCase()] || ''
  }

  const handleCodigoLoteChange = (nuevoCodigo) => {
    const codigoLimpio = String(nuevoCodigo ?? '').trim().toUpperCase()
    const sugerenciaActual = obtenerObservacionSugerida(codigoLote)
    const sugerenciaNueva = obtenerObservacionSugerida(codigoLimpio)

    setCodigoLoteState(codigoLimpio)

    if (sugerenciaNueva) {
      if (!observacionLote.trim() || observacionLote === sugerenciaActual) {
        setObservacionLote(sugerenciaNueva)
      }
    } else if (observacionLote.trim() && observacionLote === sugerenciaActual) {
      setObservacionLote('')
    }
  }

  const agregarIdTemporal = (nuevoId, onDuplicado) => {
    const limpio = String(nuevoId ?? '').trim()
    if (!limpio) return { agregado: false, id: '' }

    if (idsTemporalesRef.current.includes(limpio)) {
      onDuplicado?.(limpio)
      return { agregado: false, id: limpio }
    }

    idsTemporalesRef.current = [...idsTemporalesRef.current, limpio]
    setIdsTemporales(idsTemporalesRef.current)
    return { agregado: true, id: limpio }
  }

  const quitarIdTemporal = (idQuitar) => {
    idsTemporalesRef.current = idsTemporalesRef.current.filter((id) => id !== idQuitar)
    setIdsTemporales(idsTemporalesRef.current)
  }

  const limpiarLote = () => {
    idsTemporalesRef.current = []
    setIdsTemporales([])
    setHoraLote('')
    setCodigoLoteState('')
    setObservacionLote('')
    setEsNoUrbanaLote(false)
    setMostraTribunalLote(false)
    setRitLote('')
    setAñoLote('')
  }

  const handleHoraLoteChange = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 4)
    setHoraLote(soloNumeros)
  }

  const handleCodigoLoteManualChange = (e) => {
    const limpio = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
    handleCodigoLoteChange(limpio.toUpperCase())
  }

  return {
    idsTemporales,
    horaLote,
    codigoLote,
    observacionLote,
    esNoUrbanaLote,
    mostraTribunalLote,
    ritLote,
    añoLote,
    setHoraLote,
    setCodigoLote: handleCodigoLoteChange,
    setObservacionLote,
    setEsNoUrbanaLote,
    setMostraTribunalLote,
    setRitLote,
    setAñoLote,
    agregarIdTemporal,
    quitarIdTemporal,
    limpiarLote,
    handleHoraLoteChange,
    handleCodigoLoteManualChange,
  }
}

export default useLoteForm