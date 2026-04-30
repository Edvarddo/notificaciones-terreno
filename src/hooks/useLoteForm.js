import { useRef, useState } from 'react'

function useLoteForm() {
  const [idsTemporales, setIdsTemporales] = useState([])
  const idsTemporalesRef = useRef([])
  const [horaLote, setHoraLote] = useState('')
  const [codigoLote, setCodigoLoteState] = useState('')
  const [observacionLote, setObservacionLote] = useState('')
  const [esNoUrbanaLote, setEsNoUrbanaLote] = useState(false)
  const [mostraTribunalLote, setMostraTribunalLote] = useState(false)
  const [tribunalesLote, setTribunalesLote] = useState([{ rit: '', año: '' }])

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
    setTribunalesLote([{ rit: '', año: '' }])
  }

  const handleHoraLoteChange = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 4)
    setHoraLote(soloNumeros)
  }

  const handleCodigoLoteManualChange = (e) => {
    const limpio = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
    handleCodigoLoteChange(limpio.toUpperCase())
  }

  const agregarTribunalLote = () => {
    setTribunalesLote((prev) => [...prev, { rit: '', año: '' }])
  }

  const copiarUltimoTribunalLote = () => {
    setTribunalesLote((prev) => {
      const ultimo = prev[prev.length - 1] || { rit: '', año: '' }
      return [...prev, { ...ultimo }]
    })
  }

  const quitarTribunalLote = (indexQuitar) => {
    setTribunalesLote((prev) => {
      const siguiente = prev.filter((_, index) => index !== indexQuitar)
      return siguiente.length > 0 ? siguiente : [{ rit: '', año: '' }]
    })
  }

  const actualizarTribunalLote = (index, campo, valor) => {
    setTribunalesLote((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [campo]: valor } : item))
    )
  }

  return {
    idsTemporales,
    horaLote,
    codigoLote,
    observacionLote,
    esNoUrbanaLote,
    mostraTribunalLote,
    tribunalesLote,
    setHoraLote,
    setCodigoLote: handleCodigoLoteChange,
    setObservacionLote,
    setEsNoUrbanaLote,
    setMostraTribunalLote,
    setTribunalesLote,
    agregarIdTemporal,
    quitarIdTemporal,
    limpiarLote,
    handleHoraLoteChange,
    handleCodigoLoteManualChange,
    agregarTribunalLote,
    copiarUltimoTribunalLote,
    quitarTribunalLote,
    actualizarTribunalLote,
  }
}

export default useLoteForm