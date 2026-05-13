import DailyCodePage from './DailyCodePage'
import useDailyCodeSession from '../hooks/useDailyCodeSession'

export default function AuthGate({ children }) {
  const {
    hasValidSession,
    submitCode,
    requestCode,
    verifying,
    requestingCode,
    checkingSession,
    error,
    requestMessage,
    requestError,
    remainingLabel,
  } =
    useDailyCodeSession()

  if (checkingSession) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <h2>Validando sesion...</h2>
          <p>Espera un momento.</p>
        </div>
      </div>
    )
  }

  if (hasValidSession) {
    return (
      <>
        <div
          style={{
            position: 'fixed',
            right: 12,
            bottom: 12,
            zIndex: 1200,
            background: '#0f3f63',
            color: '#fff',
            padding: '8px 10px',
            borderRadius: 8,
            fontSize: 12,
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
          }}
        >
          Sesion activa · expira en {remainingLabel}
        </div>
        {children}
      </>
    )
  }

  return (
    <DailyCodePage
      verifying={verifying}
      requestingCode={requestingCode}
      error={error}
      requestMessage={requestMessage}
      requestError={requestError}
      onSubmit={submitCode}
      onRequestCode={requestCode}
    />
  )
}
