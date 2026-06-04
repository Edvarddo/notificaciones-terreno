import { useEffect, useMemo, useRef, useState } from 'react'

const CODE_LENGTH = 6

export default function DailyCodePage({
  users = [],
  selectedUserId,
  onSelectedUserIdChange,
  verifying,
  requestingCode,
  error,
  requestMessage,
  requestError,
  onSubmit,
  onRequestCode,
}) {
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''))
  const [showUsers, setShowUsers] = useState(false)
  const [codeRequested, setCodeRequested] = useState(false)
  const inputRefs = useRef([])
  const submittedRef = useRef(false)
  const lastSubmittedCodeRef = useRef('')

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [users, selectedUserId],
  )

  const selectedInitials = selectedUser?.initials || ''

  const code = useMemo(() => digits.join(''), [digits])
  const isComplete = code.length === CODE_LENGTH && /^[0-9]{6}$/.test(code)

  useEffect(() => {
    if (codeRequested) {
      inputRefs.current[0]?.focus()
    }
  }, [codeRequested])

  useEffect(() => {
    if (isComplete && !verifying && code !== lastSubmittedCodeRef.current) {
      lastSubmittedCodeRef.current = code
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

    requestAnimationFrame(() => {
      const targetIndex = Math.min(CODE_LENGTH - 1, index + chars.length)
      focusIndex(targetIndex)
    })
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

    const pasted = event.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, CODE_LENGTH)

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
    lastSubmittedCodeRef.current = ''

    if (codeRequested) {
      requestAnimationFrame(() => focusIndex(0))
    }
  }

  const handleSelectUser = (userId) => {
    onSelectedUserIdChange(userId)
    setShowUsers(false)
    setCodeRequested(false)
    handleClear()
  }

  const handleRequestCode = async () => {
    if (!selectedUserId || requestingCode || verifying) return

    handleClear()

    const result = await onRequestCode?.(selectedUserId)

    if (result?.ok) {
      setCodeRequested(true)
      requestAnimationFrame(() => focusIndex(0))
    }
  }

  return (
    <main className="auth-page auth-page-new">
      <section className="auth-shell auth-shell-single">
        <form className="auth-card" onSubmit={handleSubmit} autoComplete="off">
          <div className="auth-card-header">
            <div>
              <h2>Acceso a terreno</h2>
              <p>Selecciona tu usuario, solicita el código y escríbelo para continuar.</p>
            </div>
          </div>

          <div className="auth-user-box">
            <p className="auth-user-label">Usuario</p>

            <div className="auth-user-row">
              <div className="auth-user-selector">
                <button
                  type="button"
                  className="auth-user-current"
                  onClick={() => setShowUsers((value) => !value)}
                  disabled={verifying || requestingCode}
                >
                  <span className="auth-user-avatar">
                    {selectedUser ? selectedUser.initials.slice(0, 2) : '?'}
                  </span>

                  <span className="auth-user-name">
                    {selectedUser ? selectedUser.initials : 'Selecciona usuario'}
                  </span>

                  <span className="auth-user-arrow">▾</span>
                </button>

                {showUsers ? (
                  <div className="auth-user-dropdown">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="auth-user-item"
                        onClick={() => handleSelectUser(user.id)}
                        disabled={verifying || requestingCode}
                      >
                        <span className="auth-user-avatar">
                          {user.initials.slice(0, 2)}
                        </span>

                        <span className="auth-user-name">{user.initials}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedUserId ? (
                <button
                  type="button"
                  className="auth-request auth-request-compact"
                  onClick={handleRequestCode}
                  disabled={verifying || requestingCode}
                >
                  {requestingCode ? 'Solicitando...' : codeRequested ? 'Reenviar' : 'Solicitar'}
                </button>
              ) : null}
            </div>
          </div>

          {requestMessage ? <div className="auth-request-message">{requestMessage}</div> : null}
          {requestError ? <div className="mensaje-error auth-error">{requestError}</div> : null}
          {error ? <div className="mensaje-error auth-error">{error}</div> : null}

          {selectedUserId && codeRequested ? (
            <>
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

              <button
                type="button"
                className="auth-reset"
                onClick={handleClear}
                disabled={verifying || requestingCode}
              >
                Limpiar código
              </button>

              <p className="auth-help">
                Si pegas el código completo, se distribuye automáticamente en las 6 casillas.
              </p>
            </>
          ) : null}
        </form>
      </section>
    </main>
  )
}