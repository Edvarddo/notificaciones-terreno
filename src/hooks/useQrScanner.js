import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { playBeep } from '../lib/sounds'

export default function useQrScanner({ qrRegionId = 'qr-reader', onDetected, onError } = {}) {
  const [escaneando, setEscaneando] = useState(false)
  const instanceRef = useRef(null)
  const startingRef = useRef(false)
  const lastCodeRef = useRef(null)
  const lastTimeRef = useRef(0)
  const DEBOUNCE_MS = 500

  const iniciarConCamara = async (html5Qr, config) => {
    try {
      const cams = await Html5Qrcode.getCameras()
      const preferred = cams?.find((c) => /back|rear|environment/i.test(c.label)) || cams?.[0]
      const target = preferred?.id || preferred?.deviceId
      if (target) {
        await html5Qr.start(target, config, async (decodedText) => {
          const now = Date.now()
          if (decodedText === lastCodeRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return

          lastCodeRef.current = decodedText
          lastTimeRef.current = now
          try { playBeep() } catch {}
          await onDetected?.(decodedText)
        }, () => {})
        return
      }
    } catch {
      // fallback below
    }

    await html5Qr.start(
      { facingMode: 'environment' },
      config,
      async (decodedText) => {
        const now = Date.now()
        if (decodedText === lastCodeRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return

        lastCodeRef.current = decodedText
        lastTimeRef.current = now
        try { playBeep() } catch {}
        await onDetected?.(decodedText)
      },
      () => {}
    )
  }

  const detenerEscaneo = async () => {
    startingRef.current = false
    lastCodeRef.current = null
    lastTimeRef.current = 0

    try {
      if (instanceRef.current) {
        const state = instanceRef.current.getState?.()
        if (state === 2 || state === 1) {
          await instanceRef.current.stop()
        }
        await instanceRef.current.clear()
      }
    } catch {
      // ignore
    } finally {
      instanceRef.current = null
      setEscaneando(false)
    }
  }

  const iniciarEscaneo = () => {
    if (escaneando || startingRef.current) return

    const contenedor = document.getElementById(qrRegionId)
    if (!contenedor) {
      onError?.(`No se encontró el lector QR: ${qrRegionId}`)
      return
    }

    startingRef.current = true
    setEscaneando(true)

    const iniciar = async () => {
      try {
        const html5Qr = new Html5Qrcode(qrRegionId, { verbose: false })
        instanceRef.current = html5Qr
        const config = { fps: 10, qrbox: { width: 300, height: 300 }, disableFlip: false }
        await iniciarConCamara(html5Qr, config)
      } catch (error) {
        onError?.(`No se pudo iniciar la cámara: ${error?.message || error}`)
        setEscaneando(false)
        instanceRef.current = null
      } finally {
        startingRef.current = false
      }
    }

    iniciar().catch(() => {
      startingRef.current = false
      setEscaneando(false)
    })
  }

  useEffect(() => {
    return () => {
      detenerEscaneo().catch(() => {})
    }
  }, [])

  return {
    escaneando,
    iniciarEscaneo,
    detenerEscaneo,
    start: iniciarEscaneo,
    stop: detenerEscaneo,
  }
}