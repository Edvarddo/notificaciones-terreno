const FINALIZAR_CARGA_URL =
  import.meta.env.VITE_FINALIZAR_CARGA_URL ||
  'https://xshskpzrkiieyfowalxz.supabase.co/functions/v1/finalizar-carga'

async function readJsonSafe(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

export async function enviarReporteFinalizacionCarga(fecha) {
  try {
    const res = await fetch(FINALIZAR_CARGA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ fecha }),
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