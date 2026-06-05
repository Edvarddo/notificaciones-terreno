import { useEffect, useState } from 'react'
import { requestDailyCode, validateAccessSession, verifyDailyCode } from '../services/auth'

export default function useDailyCodeSession() {
  const [sessionUserId, setSessionUserId] = useState(() => {
    return localStorage.getItem('daily_access_user_id') || null
  })

  const [sessionExpiresAt, setSessionExpiresAt] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [requestingCode, setRequestingCode] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [nowMs, setNowMs] = useState(() => Date.now())

  const expiresAtMs = sessionExpiresAt
    ? new Date(sessionExpiresAt).getTime()
    : null

  const remainingMs = expiresAtMs
    ? Math.max(0, expiresAtMs - nowMs)
    : 0

  const hasValidSession = Boolean(
    sessionUserId &&
    expiresAtMs &&
    remainingMs > 0
  )

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

  const setSession = (expiresAt) => {
    const nextExpiresAt = new Date(expiresAt)

    setSessionExpiresAt(nextExpiresAt)
    setModalOpen(false)
    setError('')
  }

  const clearSession = () => {
    setSessionExpiresAt(null)
    setSessionUserId(null)

    localStorage.removeItem('daily_access_token')
    localStorage.removeItem('daily_access_user_id')

    setModalOpen(true)
  }

  const logout = () => {
    clearSession()
    setError('')
    setRequestMessage('')
    setRequestError('')
  }

  useEffect(() => {
    const id = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false

    const bootstrapSession = async () => {
      try {
        const storedUserId = localStorage.getItem('daily_access_user_id')
        const check = await validateAccessSession()

        if (cancelled) return

        if (check?.ok && check?.session_expires_at && storedUserId) {
          setSessionUserId(storedUserId)
          setSession(new Date(check.session_expires_at))
        } else {
          clearSession()
          setError('')
        }
      } catch {
        if (!cancelled) {
          clearSession()
          setError('')
        }
      } finally {
        if (!cancelled) {
          setCheckingSession(false)
        }
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

  const submitCode = async (code, userId) => {
    setVerifying(true)
    setError('')

    try {
      const json = await verifyDailyCode(code, userId)

      if (json?.ok && json?.session_expires_at && json?.user_id) {
        localStorage.setItem('daily_access_user_id', json.user_id)
        setSessionUserId(json.user_id)
        setSession(json.session_expires_at)

        return {
          ok: true,
          userId: json.user_id,
        }
      }

      const msg = json?.error || 'Codigo invalido'
      setError(msg)

      return {
        ok: false,
        error: msg,
      }
    } catch (err) {
      const msg = err?.message || 'Error de red'
      setError(msg)

      return {
        ok: false,
        error: msg,
      }
    } finally {
      setVerifying(false)
    }
  }

  const requestCode = async (userId) => {
    setRequestingCode(true)
    setRequestError('')
    setRequestMessage('')

    try {
      const json = await requestDailyCode(userId)

      if (json?.ok) {
        setRequestMessage(json?.message || 'Se envio un nuevo codigo al correo configurado.')
        return { ok: true }
      }

      const msg = json?.error || 'No se pudo enviar el codigo'
      setRequestError(msg)

      return {
        ok: false,
        error: msg,
      }
    } catch (err) {
      const msg = err?.message || 'Error de red'
      setRequestError(msg)

      return {
        ok: false,
        error: msg,
      }
    } finally {
      setRequestingCode(false)
    }
  }

  useEffect(() => {
    if (!requestMessage) return

    const timer = setTimeout(() => {
      setRequestMessage('')
    }, 4000)

    return () => clearTimeout(timer)
  }, [requestMessage])

  useEffect(() => {
    if (!requestError) return

    const timer = setTimeout(() => {
      setRequestError('')
    }, 4000)

    return () => clearTimeout(timer)
  }, [requestError])

  useEffect(() => {
    if (!error) return

    const timer = setTimeout(() => {
      setError('')
    }, 4000)

    return () => clearTimeout(timer)
  }, [error])

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
    sessionUserId,
    logout,
  }
}