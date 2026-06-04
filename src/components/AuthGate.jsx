import React from 'react'
import { useEffect, useState } from 'react'
import DailyCodePage from './DailyCodePage'
import useDailyCodeSession from '../hooks/useDailyCodeSession'
import { supabase } from '../lib/supabase'

export default function AuthGate({ children }) {
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')

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
    sessionUserId,
  } = useDailyCodeSession()
  const sessionUser = users.find(
    (user) => user.id === sessionUserId,
  )

  useEffect(() => {
    const loadUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, initials')
        .eq('active', true)
        .order('initials', { ascending: true })

      if (!error) setUsers(data || [])
    }

    loadUsers()
  }, [])

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

        {React.cloneElement(children, {
          sessionUserId,
          sessionUserInitials: sessionUser?.initials || '',
        })}
      </>
    )
  }

  return (
    <DailyCodePage
      users={users}
      selectedUserId={selectedUserId}
      onSelectedUserIdChange={setSelectedUserId}
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