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
  const [codigoPorId, setCodigoPorId] = useState({})
  const [observacionPorId, setObservacionPorId] = useState({})
  const [a1Caso, setA1Caso] = useState('')
  const [a1Valor1, setA1Valor1] = useState('')
  const [a1Valor2, setA1Valor2] = useState('')
  const [a3Caso, setA3Caso] = useState('')

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
    COMIENZA: {
      etiqueta: 'La numeración comienza en XXXX',
      requiere: 1,
      build: (v1) => (v1 ? `Se constata que la numeración comienza en ${v1}.` : 'Se constata que la numeración comienza en un valor determinado.'),
    },
    TERMINA: {
      etiqueta: 'La numeración termina en YYYY',
      requiere: 1,
      build: (v1) => (v1 ? `Se constata que la numeración termina en ${v1}.` : 'Se constata que la numeración termina en un valor determinado.'),
    },
    ENTRE: {
      etiqueta: 'La numeración está entre XXXX y YYYY',
      requiere: 2,
      build: (v1, v2) => {
        if (v1 && v2) return `Se constata numeración entre ${v1} y ${v2}.`
        if (v1) return `Se constata numeración a partir de ${v1}.`
        return 'Se constata numeración en un rango no especificado.'
      },
    },
    SIN_ORDEN: {
      etiqueta: 'Numeración no definida en el área',
      requiere: 0,
      build: () =>
        'Se constata que la numeración no se encuentra y no existe un orden definido en el área.',
    },
    COMIENZA: {
      etiqueta: 'La numeración comienza en XXXX',
      requiere: 1,
      build: (v1) => (v1 ? `Se constata que la numeración comienza en ${v1}.` : 'Se constata que la numeración comienza en un valor determinado.'),
    },
    TERMINA: {
      etiqueta: 'La numeración termina en YYYY',
      requiere: 1,
      build: (v1) => (v1 ? `Se constata que la numeración termina en ${v1}.` : 'Se constata que la numeración termina en un valor determinado.'),
    },
    ENTRE: {
      etiqueta: 'La numeración está entre XXXX y YYYY',
      requiere: 2,
      build: (v1, v2) => {
        if (v1 && v2) return `Se constata numeración entre ${v1} y ${v2}.`
        if (v1) return `Se constata numeración a partir de ${v1}.`
        return 'Se constata numeración en un rango no especificado.'
      },
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
    A1: Object.values(A1_CASOS).map((caso) => caso.etiqueta),
    A3: Object.values(A3_CASOS).map((caso) => caso.etiqueta),

    D1: '.',
    D2: '.',
    D3: '.',
    D4: '.',
    E1: 'Se notifica personalmente en terreno',

    A2: '.',
    A4: '.',
    A5: '.',
    F4: '.',

    B2: '.',
    B3: 'Se deja aviso',
    B5: '.',
    B6: '.',
    B7: 'Se deja aviso',
    B8: '.',
    B9: '.',
    B10: '.',
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
        if (codigoLimpio === 'A1') {
          const casoInicial = 'SALTO'
          const textoInicial = A1_CASOS[casoInicial].build('', '')
          if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) {
            setObservacionLote(textoInicial)
          }
          setA1Caso(casoInicial)
          setA1Valor1('')
          setA1Valor2('')
        } else if (codigoLimpio === 'A3') {
          const casoInicial = 'FALTA_NUMERO_CASA'
          const textoInicial = A3_CASOS[casoInicial].build()
          if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) {
            setObservacionLote(textoInicial)
          }
          setA3Caso(casoInicial)
        } else {
          const primer = sugerenciaNueva[0]
          if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) setObservacionLote(primer)
        }
      } else {
        if (!observacionLote.trim() || observacionLote === sugerenciaActualNorm) {
          setObservacionLote(sugerenciaNueva)
        }
        setA1Caso('')
        setA1Valor1('')
        setA1Valor2('')
        setA3Caso('')
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

  const construirObservacionA3 = (caso) => {
    const casoActual = A3_CASOS[caso]
    if (!casoActual) return ''
    return casoActual.build()
  }

  const handleA1CasoChange = (caso) => {
    const anterior = construirObservacionA1(a1Caso, a1Valor1, a1Valor2)
    setA1Caso(caso)
    const nueva = construirObservacionA1(caso, '', '')
    if (!observacionLote.trim() || observacionLote === anterior) {
      setObservacionLote(nueva)
    }
  }

  const handleA3CasoChange = (caso) => {
    const anterior = construirObservacionA3(a3Caso)
    setA3Caso(caso)
    const nueva = construirObservacionA3(caso)
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
    // also remove any per-id codigo override
    setCodigoPorId((prev) => {
      const next = { ...prev }
      delete next[idQuitar]
      return next
    })
    // also remove any per-id observacion override
    setObservacionPorId((prev) => {
      const next = { ...prev }
      delete next[idQuitar]
      return next
    })
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
    setCodigoPorId({})
    setObservacionPorId({})
    setA1Caso('')
    setA1Valor1('')
    setA1Valor2('')
  }

  const setCodigoParaId = (id, codigo) => {
    const limpio = String(codigo ?? '').trim().toUpperCase()
    setCodigoPorId((prev) => ({ ...prev, [id]: limpio }))
  }

  const setObservacionParaId = (id, observacion) => {
    const limpio = String(observacion ?? '').trim()
    setObservacionPorId((prev) => ({ ...prev, [id]: limpio }))
  }

  const obtenerObservacionParaId = (id) => {
    return String(observacionPorId[id] ?? '')
  }

  const obtenerCodigoParaId = (id) => {
    return String(codigoPorId[id] ?? '')
  }

  const handleHoraLoteChange = (valorOEvento) => {
    const valor =
      typeof valorOEvento === 'string'
        ? valorOEvento
        : valorOEvento?.target?.value ?? ''

    const soloNumeros = valor.replace(/\D/g, '').slice(0, 4)

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
    observacionPorId,
    esNoUrbanaLote,
    mostraTribunalLote,
    tribunalesLote,
    codigoPorId,
    setHoraLote,
    setCodigoLote: handleCodigoLoteChange,
    setObservacionLote,
    setEsNoUrbanaLote,
    setMostraTribunalLote,
    setTribunalesLote,
    setCodigoParaId,
    setObservacionParaId,
    obtenerObservacionParaId,
    obtenerCodigoParaId,
    obtenerObservacionSugerida,
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
    a3Caso,
    a3Casos: A3_CASOS,
    handleA3CasoChange,
    a1Casos: A1_CASOS,
    handleA1CasoChange,
    handleA1Valor1Change,
    handleA1Valor2Change,
  }
}

export default useLoteForm