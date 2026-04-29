import { useEffect, useRef, useState } from 'react'

function normalizarTexto(texto) {
  return String(texto || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/[|]/g, 'I')
    .trim()
}

function limpiarRit(rit) {
  return String(rit || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function extraerRitYAnio(texto) {
  const textoNormalizado = normalizarTexto(texto)
  const anioMatch = textoNormalizado.match(/\b(19|20)\d{2}\b/)
  const anio = anioMatch?.[0] || ''

  const patronesRit = [
    /\b(?:RIT\s*[:\-\.]?\s*)?([A-Z]{1,5}\s*[-]\s*\d{1,6}\s*[-]\s*(?:19|20)\d{2})\b/,
    /\b(?:RIT\s*[:\-\.]?\s*)?([A-Z]{1,5}\s*\d{1,6}\s*[-]\s*(?:19|20)\d{2})\b/,
    /\b([A-Z]{1,5}\s*[-]\s*\d{1,6})\b/,
  ]

  let rit = ''
  for (const patron of patronesRit) {
    const match = textoNormalizado.match(patron)
    if (match?.[1]) {
      rit = limpiarRit(match[1])
      break
    }
  }

  if (rit && anio && !rit.endsWith(`-${anio}`)) {
    rit = `${rit}-${anio}`
  }

  return {
    rit,
    año: anio,
    texto: textoNormalizado,
  }
}

function useTribunalOcr({ onDetected, onError } = {}) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const workerRef = useRef(null)
  const [activo, setActivo] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [textoReconocido, setTextoReconocido] = useState('')
  const [resultado, setResultado] = useState({ rit: '', año: '' })

  const obtenerWorker = async () => {
    if (workerRef.current) return workerRef.current

    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('spa+eng')
    workerRef.current = worker
    return worker
  }

  const detenerCamara = async () => {
    const video = videoRef.current
    const stream = streamRef.current

    if (video) {
      video.pause?.()
      video.srcObject = null
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }

    streamRef.current = null
    setActivo(false)
  }

  const iniciarCamara = async () => {
    if (activo || streamRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
        },
      })

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error('No se encontró el elemento de video para OCR')
      }

      streamRef.current = stream
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()
      setActivo(true)
      setTextoReconocido('')
      setResultado({ rit: '', año: '' })
    } catch (error) {
      onError?.(`No se pudo abrir la cámara OCR: ${error?.message || error}`)
    }
  }

  const capturarTexto = async () => {
    const video = videoRef.current
    if (!video || !activo) {
      onError?.('Primero abre la cámara OCR')
      return null
    }

    try {
      setProcesando(true)

      const canvas = canvasRef.current || document.createElement('canvas')
      canvasRef.current = canvas

      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) throw new Error('No se pudo preparar el canvas OCR')

      ctx.drawImage(video, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)

      const worker = await obtenerWorker()
      const { data } = await worker.recognize(dataUrl)
      const texto = data?.text || ''
      const parsed = extraerRitYAnio(texto)

      setTextoReconocido(parsed.texto)
      setResultado({ rit: parsed.rit, año: parsed.año })

      if (parsed.rit || parsed.año) {
        onDetected?.(parsed)
      } else {
        onError?.('No se pudo detectar RIT ni año en la imagen')
      }

      return parsed
    } catch (error) {
      onError?.(`No se pudo leer el texto: ${error?.message || error}`)
      return null
    } finally {
      setProcesando(false)
    }
  }

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate?.().catch(() => {})
        workerRef.current = null
      }
      detenerCamara().catch(() => {})
    }
  }, [])

  return {
    activo,
    procesando,
    textoReconocido,
    resultado,
    videoRef,
    iniciarCamara,
    detenerCamara,
    capturarTexto,
  }
}

export default useTribunalOcr