import { useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

export default function ZxingScanner({ onDetected }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)

  useEffect(() => {
    let activo = true

    const iniciar = async () => {
      try {
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (!activo) return
            if (result) {
              onDetected?.(result.getText())
            }
          }
        )
      } catch (error) {
        console.error('[ZXING ERROR]', error)
      }
    }

    iniciar()

    return () => {
      activo = false
      try {
        readerRef.current?.reset()
      } catch {}
    }
  }, [onDetected])

  return (
    <video
      ref={videoRef}
      className="scanner-modal-region zxing-video"
      muted
      playsInline
      autoPlay
    />
  )
}