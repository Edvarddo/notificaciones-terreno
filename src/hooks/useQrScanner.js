import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

function useQrScanner({ elementId, onDecoded, onError }) {
  const [escaneando, setEscaneando] = useState(false)

  const qrRef = useRef(null)
  const iniciandoRef = useRef(false)
  const onDecodedRef = useRef(onDecoded)
  const onErrorRef = useRef(onError)

  useEffect(() => {
    onDecodedRef.current = onDecoded
  }, [onDecoded])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const iniciarEscaneo = () => {
    if (escaneando || iniciandoRef.current) return
    setEscaneando(true)
  }

  const detenerEscaneo = async () => {
    iniciandoRef.current = false

    try {
      if (qrRef.current) {
        const state = qrRef.current.getState?.()
        if (state === 2 || state === 1) {
          await qrRef.current.stop()
        }
        await qrRef.current.clear()
      }
    } catch (error) {
      console.error(`Error al detener QR (${elementId}):`, error)
    } finally {
      qrRef.current = null
      setEscaneando(false)
    }
  }

  useEffect(() => {
    if (!escaneando) return

    let cancelado = false

    const iniciar = async () => {
      const contenedor = document.getElementById(elementId)

      if (!contenedor) {
        onErrorRef.current?.(`No se encontro el contenedor del lector QR: ${elementId}`)
        setEscaneando(false)
        return
      }

      if (iniciandoRef.current) return
      iniciandoRef.current = true

      try {
        const qr = new Html5Qrcode(elementId)
        qrRef.current = qr

        await qr.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1,
          },
          async (decodedText) => {
            if (cancelado) return
            await onDecodedRef.current?.(decodedText)
          },
          () => {
            // ignorar errores continuos de lectura
          }
        )
      } catch (error) {
        console.error(`Error iniciando cámara (${elementId}):`, error)
        onErrorRef.current?.(`No se pudo iniciar la cámara: ${error.message || error}`)
        setEscaneando(false)
        qrRef.current = null
      } finally {
        iniciandoRef.current = false
      }
    }

    const timer = setTimeout(() => {
      iniciar()
    }, 100)

    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [escaneando, elementId])

  return {
    escaneando,
    iniciarEscaneo,
    detenerEscaneo,
  }
}

export default useQrScanner