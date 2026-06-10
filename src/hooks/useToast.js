import { useState, useRef } from 'react'

export default function useToast() {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const showToast = (texto, tipo = 'success', duracion = 1800) => {
    clearTimeout(timerRef.current)

    setToast({
      texto,
      tipo,
    })

    timerRef.current = setTimeout(() => {
      setToast(null)
    }, duracion)
  }

  return {
    toast,
    showToast,
  }
}