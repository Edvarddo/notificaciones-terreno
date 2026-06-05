import React from 'react'
import { useEffect, useState } from 'react'
import DailyCodePage from './DailyCodePage'
import useDailyCodeSession from '../hooks/useDailyCodeSession'
import { supabase } from '../lib/supabase'
import SessionSidebar from './SessionSidebar'

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

    logout
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
    const confirmarLogout = () => {
      const ok = window.confirm('¿Cerrar la sesión activa?')
      if (ok) logout()
    }
    return (
      <>
        <SessionSidebar
          initials={sessionUser?.initials || ''}
          remainingLabel={remainingLabel}
          onLogout={logout}
        />

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