import { useEffect, useState } from 'react'
import useQrScanner from '../hooks/useQrScanner'

export default function QrScannerModal({
  abierto,
  titulo,
  descripcion,
  qrRegionId,
  onClose,
  onDetected,
  onError,
}) {
  const [errorMsg, setErrorMsg] = useState(null)

  const handleError = (m) => {
    setErrorMsg(m)
    onError?.(m)
  }

  const scanner = useQrScanner({
    qrRegionId,
    onError: handleError,
    onDetected,
  })

  useEffect(() => {
    let mounted = true

    const stopIfPossible = async () => {
      try {
        if (scanner && typeof scanner.detenerEscaneo === 'function') {
          await scanner.detenerEscaneo()
        }
      } catch {}
    }

    const startIfPossible = async () => {
      try {
        if (!mounted) return
        // reset previous error when opening
        setErrorMsg(null)
        if (scanner && typeof scanner.iniciarEscaneo === 'function') {
          await scanner.iniciarEscaneo()
        }
      } catch (e) {
        // ensure errors bubble through our handler
        setErrorMsg(e?.message || String(e))
      }
    }

    if (!abierto) {
      void stopIfPossible()
      return () => {
        mounted = false
      }
    }

    void startIfPossible()

    return () => {
      mounted = false
      void stopIfPossible()
    }
  }, [abierto, qrRegionId])

  if (!abierto) return null

  return (
    <div className="dialogo-overlay top" onClick={onClose}>
      <div className="dialogo-codigos dialogo-qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dialogo-header">
          <div>
            <h3 className="dialogo-titulo">{titulo}</h3>
            {descripcion ? <p className="scanner-descripcion">{descripcion}</p> : null}
          </div>

          <button type="button" className="dialogo-cerrar" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="scanner-modal-contenido">
          <div className="scanner-modal-preview">
            <div id={qrRegionId} className="scanner-modal-region" />
            {!scanner.escaneando && errorMsg ? (
              <div className="scanner-modal-error">
                <p>{errorMsg}</p>
                <div className="scanner-modal-error-acciones">
                  <button
                    type="button"
                    className="boton-secundario"
                    onClick={async () => {
                      try {
                        if (scanner && typeof scanner.iniciarEscaneo === 'function') {
                          await scanner.iniciarEscaneo()
                        }
                      } catch (e) {
                        setErrorMsg(e?.message || String(e))
                      }
                    }}
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="qr-zoom-bar">
            <button type="button" className="boton-mini" onClick={scanner.zoomOut} aria-label="Alejar cámara">
              -
            </button>
            <span className="qr-zoom-valor">Zoom {Math.round((scanner.zoom || 1) * 100)}%</span>
            <button type="button" className="boton-mini" onClick={scanner.zoomIn} aria-label="Acercar cámara">
              +
            </button>
            <button type="button" className="boton-mini" onClick={scanner.resetZoom} aria-label="Restablecer zoom">
              Reset
            </button>
          </div>

          <div className="scanner-modal-ayuda">
            Apunta la cámara al código QR. Si no inicia, revisa permisos y que la app esté en HTTPS.
          </div>
        </div>
      </div>
    </div>
  )
}