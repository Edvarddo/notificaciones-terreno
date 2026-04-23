import { useEffect } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export default function QrScanner({ id, onScan }) {
  useEffect(() => {
    const qr = new Html5Qrcode(id)

    qr.start(
      { facingMode: 'environment' },
      { fps: 10 },
      (text) => onScan(text)
    )

    return () => {
      qr.stop().catch(() => {})
      qr.clear().catch(() => {})
    }
  }, [])

  return <div id={id}></div>
}