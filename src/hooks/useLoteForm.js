import { useState } from 'react'

function useLoteForm() {
  const [idsTemporales, setIdsTemporales] = useState([])
  const [horaLote, setHoraLote] = useState('')
  const [codigoLote, setCodigoLote] = useState('')
  const [observacionLote, setObservacionLote] = useState('')
  const [esNoUrbanaLote, setEsNoUrbanaLote] = useState(false)

  const agregarIdTemporal = (nuevoId) => {
    const limpio = String(nuevoId ?? '').trim()
    if (!limpio) return { agregado: false, id: '' }

    if (idsTemporales.includes(limpio)) {
      return { agregado: false, id: limpio }
    }

    setIdsTemporales((prev) => [...prev, limpio])
    return { agregado: true, id: limpio }
  }

  const quitarIdTemporal = (idQuitar) => {
    setIdsTemporales((prev) => prev.filter((id) => id !== idQuitar))
  }

  const limpiarLote = () => {
    setIdsTemporales([])
    setHoraLote('')
    setCodigoLote('')
    setObservacionLote('')
    setEsNoUrbanaLote(false)
  }

  const handleHoraLoteChange = (e) => {
    const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 4)
    setHoraLote(soloNumeros)
  }

  const handleCodigoLoteManualChange = (e) => {
    const limpio = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
    setCodigoLote(limpio.toUpperCase())
  }

  return {
    idsTemporales,
    horaLote,
    codigoLote,
    observacionLote,
    esNoUrbanaLote,
    setCodigoLote,
    setObservacionLote,
    setEsNoUrbanaLote,
    agregarIdTemporal,
    quitarIdTemporal,
    limpiarLote,
    handleHoraLoteChange,
    handleCodigoLoteManualChange,
  }
}

export default useLoteForm