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
  const [a1Option, setA1Option] = useState('')
  const [a1Desde, setA1Desde] = useState('')
  const [a1Hasta, setA1Hasta] = useState('')

  const OBSERVACIONES_SUGERIDAS = {
    D2: '.',
    E1: 'Se notifica personalmente en terreno',
    B3: 'Se deja aviso',
    B7: 'Se deja aviso',
    A1: [
      'RANGO DE DIRECCIONES',
      'COMIENZA EL RANGO DE NUMERACIÓN DESDE',
      'TERMINA EL RANGO DE NUMERACIÓN EN',
    ],
  }

  const obtenerObservacionSugerida = (codigoValue) => {
    return OBSERVACIONES_SUGERIDAS[codigoValue.trim().toUpperCase()] || ''
  }

  const handleCodigoLoteChange = (nuevoCodigo) => {
    const codigoLimpio = String(nuevoCodigo ?? '').trim().toUpperCase()
    const sugerenciaActual = obtenerObservacionSugerida(codigoLote)
    const sugerenciaNueva = obtenerObservacionSugerida(codigoLimpio)

    const sugerenciaActualNorm = Array.isArray(sugerenciaActual) ? (sugerenciaActual[0] || '') : sugerenciaActual
    setCodigoLoteState(codigoLimpio)

    if (sugerenciaNueva) {
      if (Array.isArray(sugerenciaNueva)) {
        const primera = sugerenciaNueva[0] || ''
        if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) {
          setObservacionLote(primera)
        }
        // keep A1 option in sync
        setA1Option(primera)
        setA1Desde('')
        setA1Hasta('')
      } else {
        if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) {
          setObservacionLote(sugerenciaNueva)
        }
        // clear any previous A1 state when not A1
        setA1Option('')
        setA1Desde('')
        setA1Hasta('')
      }
    } else if (observacionLote.trim() && observacionLote === sugerenciaActualNorm) {
      setObservacionLote('')
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
    if (!observacionLote.trim() || observacionLote === anterior) {
      setObservacionLote(nueva)
    }
  }

  const handleA1DesdeChange = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Option, a1Desde, a1Hasta)
    setA1Desde(limpio)
    const nueva = construirObservacionA1(a1Option, limpio, a1Hasta)
    if (!observacionLote.trim() || observacionLote === anterior) {
      setObservacionLote(nueva)
    }
  }

  const handleA1HastaChange = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Option, a1Desde, a1Hasta)
    setA1Hasta(limpio)
    const nueva = construirObservacionA1(a1Option, a1Desde, limpio)
    if (!observacionLote.trim() || observacionLote === anterior) {
      setObservacionLote(nueva)
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
    a1Option,
    a1Desde,
    a1Hasta,
    handleA1OptionChange,
    handleA1DesdeChange,
    handleA1HastaChange,
  }
}

export default useLoteForm