import { useEffect, useState } from 'react'
import { requestDailyCode, validateAccessSession, verifyDailyCode } from '../services/auth'

export default function useDailyCodeSession() {
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [requestingCode, setRequestingCode] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())

  const expiresAtMs = sessionExpiresAt ? new Date(sessionExpiresAt).getTime() : null
  const remainingMs = expiresAtMs ? Math.max(0, expiresAtMs - nowMs) : 0
  const hasValidSession = Boolean(expiresAtMs && remainingMs > 0)

  const formatRemaining = (ms) => {
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const remainingLabel = formatRemaining(remainingMs)

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const clearSession = () => {
    setSessionExpiresAt(null)
    setModalOpen(true)
  }

  useEffect(() => {
    let cancelled = false

    const bootstrapSession = async () => {
      // Check if there's a valid session cookie on the server
      const check = await validateAccessSession()
      if (!cancelled) {
        if (check?.ok && check?.session_expires_at) {
          setSessionExpiresAt(new Date(check.session_expires_at))
          setModalOpen(false)
          setError('')
        } else {
          clearSession()
          setError('')
        }
        setCheckingSession(false)
      }
    }

    bootstrapSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (sessionExpiresAt && !hasValidSession) {
      clearSession()
      setError('Tu sesion expiro. Ingresa el codigo nuevamente.')
    }
  }, [sessionExpiresAt, hasValidSession])

  const setSession = (expiresAt) => {
    setSessionExpiresAt(new Date(expiresAt))
    setModalOpen(false)
    setError('')
  }

  const submitCode = async (code) => {
    setVerifying(true)
    setError('')
    try {
      const json = await verifyDailyCode(code)
      if (json?.ok && json?.session_expires_at) {
        setSession(json.session_expires_at)
        return { ok: true }
      }
      setError(json?.error || 'Codigo invalido')
      return { ok: false, error: json?.error }
    } catch (err) {
      setError(err?.message || 'Error de red')
      return { ok: false, error: err?.message }
    } finally {
      setVerifying(false)
    }
  }

  const requestCode = async () => {
    setRequestingCode(true)
    setRequestError('')
    setRequestMessage('')
    try {
      const json = await requestDailyCode()
      if (json?.ok) {
        setRequestMessage('Se envió un nuevo código al correo configurado.')
        return { ok: true }
      }

      setRequestError(json?.error || 'No se pudo enviar el código')
      return { ok: false, error: json?.error }
    } catch (err) {
      setRequestError(err?.message || 'Error de red')
      return { ok: false, error: err?.message }
    } finally {
      setRequestingCode(false)
    }
  }

  return {
    modalOpen,
    setModalOpen,
    verifying,
    requestingCode,
    checkingSession,
    error,
    requestMessage,
    requestError,
    submitCode,
    requestCode,
    clearSession,
    hasValidSession,
    sessionExpiresAt,
    remainingMs,
    remainingLabel,
  }
}
