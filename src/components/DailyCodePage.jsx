import { useEffect, useMemo, useRef, useState } from 'react'

const CODE_LENGTH = 6

export default function DailyCodePage({
  verifying,
  requestingCode,
  error,
  requestMessage,
  requestError,
  onSubmit,
  onRequestCode,
}) {
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''))
  const inputRefs = useRef([])
  const submittedRef = useRef(false)

  const code = useMemo(() => digits.join(''), [digits])
  const isComplete = code.length === CODE_LENGTH && /^[0-9]{6}$/.test(code)

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (!verifying) {
      submittedRef.current = false
    }
  }, [verifying])

  useEffect(() => {
    if (isComplete && !verifying && !submittedRef.current) {
      submittedRef.current = true
      onSubmit(code)
    }
  }, [code, isComplete, verifying, onSubmit])

  const focusIndex = (index) => {
    const next = Math.max(0, Math.min(CODE_LENGTH - 1, index))
    inputRefs.current[next]?.focus()
    inputRefs.current[next]?.select?.()
  }

  const setDigitAt = (index, value) => {
    setDigits((current) => {
      const nextDigits = [...current]
      nextDigits[index] = value
      return nextDigits
    })
  }

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, '')
    if (!clean) {
      setDigitAt(index, '')
      return
    }

    const chars = clean.slice(0, CODE_LENGTH - index).split('')
    setDigits((current) => {
      const nextDigits = [...current]
      chars.forEach((char, offset) => {
        nextDigits[index + offset] = char
      })
      return nextDigits
    })

    const nextIndex = Math.min(CODE_LENGTH - 1, index + chars.length)
    if (nextIndex < CODE_LENGTH - 1 || chars.length === 1) {
      requestAnimationFrame(() => focusIndex(nextIndex + (chars.length === 1 ? 1 : 0)))
    }
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        setDigitAt(index, '')
        return
      }
      if (index > 0) {
        setDigitAt(index - 1, '')
        focusIndex(index - 1)
      }
      return
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusIndex(index - 1)
    }

    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault()
      focusIndex(index + 1)
    }
  }

  const handlePaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return

    setDigits((current) => {
      const nextDigits = [...current]
      pasted.split('').forEach((char, index) => {
        nextDigits[index] = char
      })
      return nextDigits
    })

    requestAnimationFrame(() => {
      focusIndex(Math.min(pasted.length, CODE_LENGTH - 1))
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isComplete || verifying) return
    submittedRef.current = true
    await onSubmit(code)
  }

  const handleClear = () => {
    setDigits(Array(CODE_LENGTH).fill(''))
    submittedRef.current = false
    requestAnimationFrame(() => focusIndex(0))
  }

  const handleRequestCode = async () => {
    handleClear()
    await onRequestCode?.()
  }

  return (
    <main className="auth-page auth-page-new">
      <section className="auth-shell auth-shell-single">
        <form className="auth-card" onSubmit={handleSubmit} autoComplete="off">
          <div className="auth-card-header">
            <div>
              <h2>Escribe el código</h2>
              <p>Puedes escribirlo dígito por dígito o pegarlo completo.</p>
            </div>
            <div className="auth-header-actions">
              <button type="button" className="auth-reset" onClick={handleClear} disabled={verifying || requestingCode}>
                Limpiar
              </button>
              <button
                type="button"
                className="auth-request"
                onClick={handleRequestCode}
                disabled={verifying || requestingCode}
              >
                {requestingCode ? 'Solicitando...' : 'Solicitar código'}
              </button>
            </div>
          </div>

          <div className="auth-code-grid" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  inputRefs.current[index] = node
                }}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                className="auth-code-slot"
                aria-label={`Dígito ${index + 1}`}
                disabled={verifying}
              />
            ))}
          </div>

          <button type="submit" className="auth-submit" disabled={!isComplete || verifying}>
            {verifying ? 'Verificando...' : 'Ingresar'}
          </button>

          <p className="auth-help">Si pegas el código completo, se distribuye automáticamente en las 6 casillas.</p>

          {requestMessage ? <div className="auth-request-message">{requestMessage}</div> : null}
          {requestError ? <div className="mensaje-error auth-error">{requestError}</div> : null}

          {error ? <div className="mensaje-error auth-error">{error}</div> : null}
        </form>
      </section>
    </main>
  )
}