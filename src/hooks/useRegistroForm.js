import { useState } from 'react'

function useRegistroForm() {
  const [idNotificacion, setIdNotificacion] = useState('')
  const [codigo, setCodigo] = useState('')
  const [observacion, setObservacion] = useState('')
  const [esNoUrbana, setEsNoUrbana] = useState(false)

  const limpiarFormulario = () => {
    setIdNotificacion('')
    setCodigo('')
    setObservacion('')
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
    esNoUrbana,
    setIdNotificacion,
    setCodigo,
    setObservacion,
    setEsNoUrbana,
    limpiarFormulario,
    handleCodigoManualChange,
  }
}

export default useRegistroForm