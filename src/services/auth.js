const VERIFY_URL =
  import.meta.env.VITE_VERIFY_DAILY_CODE_URL ||
  'https://xshskpzrkiieyfowalxz.supabase.co/functions/v1/verify-daily-code'

const VALIDATE_SESSION_URL =
  import.meta.env.VITE_VALIDATE_ACCESS_SESSION_URL ||
  'https://xshskpzrkiieyfowalxz.supabase.co/functions/v1/validate-access-session'

const REQUEST_DAILY_CODE_URL =
  import.meta.env.VITE_REQUEST_DAILY_CODE_URL ||
  'https://xshskpzrkiieyfowalxz.supabase.co/functions/v1/request-daily-code'

const SESSION_TOKEN_KEY = 'daily_access_token'
const SESSION_EXPIRES_KEY = 'daily_session_expires_at'
async function readJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function saveLocalSession(sessionExpiresAt) {
  if (!sessionExpiresAt) return
  localStorage.setItem(SESSION_EXPIRES_KEY, sessionExpiresAt)
}

function getValidLocalSession() {
  const expiresAt = localStorage.getItem(SESSION_EXPIRES_KEY)

  if (!expiresAt) return null

  if (new Date(expiresAt).getTime() <= Date.now()) {
    localStorage.removeItem(SESSION_EXPIRES_KEY)
    return null
  }

  return expiresAt
}

export async function verifyDailyCode(code, userId) {
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        code,
        user_id: userId,
      }),
    })

    const json = await readJsonSafe(res)

    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` }
    }

    if (json?.ok && json?.session_expires_at) {
      console.log('GUARDANDO SESION LOCAL:', json.session_expires_at)

      saveLocalSession(json.session_expires_at)

      if (json.access_token) {
        localStorage.setItem('daily_access_token', json.access_token)
      }
    }

    return json
  } catch (err) {
    return { ok: false, error: err?.message || 'Error de red' }
  }
}

export async function validateAccessSession() {
  const token = localStorage.getItem('daily_access_token')

  try {
    const res = await fetch(VALIDATE_SESSION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token
          ? {
            Authorization: `Bearer ${token}`,
          }
          : {}),
      },
      credentials: 'include',
    })

    const json = await readJsonSafe(res)

    if (res.ok && json?.ok) {
      if (json?.session_expires_at) {
        saveLocalSession(json.session_expires_at)
      }

      return {
        ...json,
        source: token ? 'token' : 'cookie',
      }
    }

    const localExpiresAt = getValidLocalSession()

    if (localExpiresAt) {
      return {
        ok: true,
        session_expires_at: localExpiresAt,
        source: 'localStorage',
      }
    }

    return {
      ok: false,
      error: json?.error || `HTTP ${res.status}`,
    }
  } catch (err) {
    const localExpiresAt = getValidLocalSession()

    if (localExpiresAt) {
      return {
        ok: true,
        session_expires_at: localExpiresAt,
        source: 'localStorage',
      }
    }

    return { ok: false, error: err?.message || 'Error de red' }
  }
}
export async function requestDailyCode(userId) {
  try {
    const res = await fetch(REQUEST_DAILY_CODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        userId,
      }),
    })

    const json = await readJsonSafe(res)

    if (!res.ok) {
      return {
        ok: false,
        error: json?.error || `HTTP ${res.status}`,
      }
    }

    return json
  } catch (err) {
    return {
      ok: false,
      error: err?.message || 'Error de red',
    }
  }
}

export function clearAccessSession() {
  localStorage.removeItem(SESSION_EXPIRES_KEY)
}