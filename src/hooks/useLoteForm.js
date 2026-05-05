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
    B7: 'Se deja aviso',
    A1: Object.values(A1_CASOS).map((caso) => caso.etiqueta),
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
        const casoInicial = 'SALTO'
        const textoInicial = A1_CASOS[casoInicial].build('', '')
        if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) {
          setObservacionLote(textoInicial)
        }
        setA1Caso(casoInicial)
        setA1Valor1('')
        setA1Valor2('')
      } else {
        if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) {
          setObservacionLote(sugerenciaNueva)
        }
        setA1Caso('')
        setA1Valor1('')
        setA1Valor2('')
      }
    } else if (observacionLote.trim() && observacionLote === sugerenciaActualNorm) {
      setObservacionLote('')
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
    if (!observacionLote.trim() || observacionLote === anterior) {
      setObservacionLote(nueva)
    }
  }

  const handleA1Valor1Change = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Caso, a1Valor1, a1Valor2)
    setA1Valor1(limpio)
    const nueva = construirObservacionA1(a1Caso, limpio, a1Valor2)
    if (!observacionLote.trim() || observacionLote === anterior) {
      setObservacionLote(nueva)
    }
  }

  const handleA1Valor2Change = (valor) => {
    const limpio = String(valor ?? '').trim()
    const anterior = construirObservacionA1(a1Caso, a1Valor1, a1Valor2)
    setA1Valor2(limpio)
    const nueva = construirObservacionA1(a1Caso, a1Valor1, limpio)
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
    setA1Caso('')
    setA1Valor1('')
    setA1Valor2('')
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
    a1Caso,
    a1Valor1,
    a1Valor2,
    a1Casos: A1_CASOS,
    handleA1CasoChange,
    handleA1Valor1Change,
    handleA1Valor2Change,
  }
}

export default useLoteForm