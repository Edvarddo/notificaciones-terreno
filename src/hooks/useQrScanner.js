import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { playBeep } from '../lib/sounds'

export default function useQrScanner({ onDetected, enabled = true, qrRegionId = 'qr-reader' } = {}) {
  const instanceRef = useRef(null)
  const lastCodeRef = useRef(null)
  const lastTimeRef = useRef(0)
  const [cameraId, setCameraId] = useState(null)
  const DEBOUNCE_MS = 500

  useEffect(() => {
    let mounted = true

    async function pickCamera() {
      try {
        const cams = await Html5Qrcode.getCameras()
        if (!mounted) return null
        if (!cams || !cams.length) return null
        const preferred = cams.find((c) => /back|rear|environment/i.test(c.label)) || cams[0]
        setCameraId(preferred.id || preferred.deviceId)
        return preferred
      } catch (e) {
        return null
      }
    }

    async function startScanner() {
      if (!enabled) return
      const prefer = await pickCamera()
      const targetId = prefer?.id ?? prefer?.deviceId ?? cameraId
      const html5Qr = new Html5Qrcode(qrRegionId, { verbose: false })
      instanceRef.current = html5Qr
      const config = { fps: 10, qrbox: { width: 300, height: 300 }, disableFlip: false }

      try {
        await html5Qr.start(
          targetId,
          config,
          (decodedText) => {
            const now = Date.now()
            if (decodedText === lastCodeRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return
            lastCodeRef.current = decodedText
            lastTimeRef.current = now
            try { playBeep() } catch {}
            onDetected?.(decodedText)
          },
          () => {}
        )
      } catch (err) {
        try {
          await html5Qr.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              const now = Date.now()
              if (decodedText === lastCodeRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return
              lastCodeRef.current = decodedText
              lastTimeRef.current = now
              try { playBeep() } catch {}
              onDetected?.(decodedText)
            },
            () => {}
          )
        } catch (e2) {
          // give up; consumer should show message
        }
      }
    }

    startScanner()

    return () => {
      mounted = false
      const inst = instanceRef.current
      if (inst) {
        inst.stop().catch(() => {}).finally(() => {
          try { inst.clear() } catch {}
        })
      }
    }
  }, [enabled, cameraId, onDetected, qrRegionId])

  return { stop: () => instanceRef.current?.stop?.(), start: () => {} }
}

export default useQrScanner