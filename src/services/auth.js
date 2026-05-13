const VERIFY_URL =
  import.meta.env.VITE_VERIFY_DAILY_CODE_URL ||
  'https://xshskpzrkiieyfowalxz.supabase.co/functions/v1/verify-daily-code'

const VALIDATE_SESSION_URL =
  import.meta.env.VITE_VALIDATE_ACCESS_SESSION_URL ||
  'https://xshskpzrkiieyfowalxz.supabase.co/functions/v1/validate-access-session'

const REQUEST_DAILY_CODE_URL =
  import.meta.env.VITE_REQUEST_DAILY_CODE_URL ||
  'https://xshskpzrkiieyfowalxz.supabase.co/functions/v1/request-daily-code'

async function readJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

export async function verifyDailyCode(code) {
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ code }),
    })

    const json = await readJsonSafe(res)
    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` }
    }

    return json
  } catch (err) {
    return { ok: false, error: err?.message || 'Error de red' }
  }
}

export async function validateAccessSession() {
  try {
    const res = await fetch(VALIDATE_SESSION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    const json = await readJsonSafe(res)
    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` }
    }

    return json
  } catch (err) {
    return { ok: false, error: err?.message || 'Error de red' }
  }
}

export async function requestDailyCode() {
  try {
    const res = await fetch(REQUEST_DAILY_CODE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    const json = await readJsonSafe(res)
    if (!res.ok) {
      return { ok: false, error: json?.error || `HTTP ${res.status}` }
    }

    return json
  } catch (err) {
    return { ok: false, error: err?.message || 'Error de red' }
  }
}
