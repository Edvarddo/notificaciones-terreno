import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { playBeep } from '../lib/sounds'

export default function useQrScanner({ qrRegionId = 'qr-reader', onDetected, onError } = {}) {
  const [escaneando, setEscaneando] = useState(false)
  const [zoom, setZoom] = useState(1)
  const instanceRef = useRef(null)
  const startingRef = useRef(false)
  const lastCodeRef = useRef(null)
  const lastTimeRef = useRef(0)
  const DEBOUNCE_MS = 500
  const ZOOM_MIN = 1
  const ZOOM_MAX = 3
  const ZOOM_STEP = 0.25

  const centrarLector = () => {
    if (typeof document === 'undefined') return

    const contenedor = document.getElementById(qrRegionId)
    const objetivo = contenedor?.closest('.qr-inline') || contenedor

    objetivo?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    })
  }

  const handleDecoded = async (decodedText) => {
    const now = Date.now()
    if (decodedText === lastCodeRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return

    lastCodeRef.current = decodedText
    lastTimeRef.current = now
    try { playBeep() } catch {}
    await onDetected?.(decodedText)
  }

  const startWithSource = async (html5Qr, config, source) => {
    await html5Qr.start(
      source,
      config,
      handleDecoded,
      () => {}
    )
  }

  const aplicarZoom = async (nuevoZoom) => {
    const html5Qr = instanceRef.current
    if (!html5Qr) return

    const zoomNormalizado = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(nuevoZoom) || ZOOM_MIN))
    try {
      await html5Qr.applyVideoConstraints({ advanced: [{ zoom: zoomNormalizado }] })
      setZoom(zoomNormalizado)
    } catch {
      onError?.('Tu dispositivo no permite ajustar el zoom de la camara')
    }
  }

  const zoomIn = () => {
    if (!escaneando) return
    void aplicarZoom(zoom + ZOOM_STEP)
  }

  const zoomOut = () => {
    if (!escaneando) return
    void aplicarZoom(zoom - ZOOM_STEP)
  }

  const resetZoom = () => {
    if (!escaneando) return
    void aplicarZoom(1)
  }

  const iniciarConCamara = async (html5Qr, config) => {
    try {
      await startWithSource(html5Qr, config, { facingMode: { exact: 'environment' } })
      return
    } catch {
      // fallback below
    }

    try {
      await startWithSource(html5Qr, config, { facingMode: 'environment' })
      return
    } catch {
      // fallback below
    }

    try {
      const cams = await Html5Qrcode.getCameras()
      const preferred = cams?.find((c) => /back|rear|environment/i.test(c.label)) || cams?.[0]
      const target = preferred?.id || preferred?.deviceId
      if (target) {
        await startWithSource(html5Qr, config, target)
        return
      }
    } catch {
      // fallback below
    }

    await startWithSource(html5Qr, config, { facingMode: 'environment' })
  }

  const detenerEscaneo = async () => {
    startingRef.current = false
    lastCodeRef.current = null
    lastTimeRef.current = 0
    setZoom(1)

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

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      onError?.('La cámara requiere una conexión segura (HTTPS). Abre la app por HTTPS en el dispositivo para usar el QR.')
      return
    }

    startingRef.current = true
    setEscaneando(true)
    window.requestAnimationFrame(() => centrarLector())

    const iniciar = async () => {
      try {
        const html5Qr = new Html5Qrcode(qrRegionId, { verbose: false })
        instanceRef.current = html5Qr
        const config = { fps: 10, qrbox: { width: 300, height: 300 }, disableFlip: false }
        await iniciarConCamara(html5Qr, config)
        window.setTimeout(() => centrarLector(), 100)
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
    zoom,
    iniciarEscaneo,
    detenerEscaneo,
    zoomIn,
    zoomOut,
    resetZoom,
    start: iniciarEscaneo,
    stop: detenerEscaneo,
  }
}