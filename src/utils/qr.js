export function extraerIdDesdeQr(texto) {
  const limpio = String(texto).trim()

  if (/^[0-9A-Za-z-]+$/.test(limpio)) {
    return limpio
  }

  try {
    const url = new URL(limpio)
    const id =
      url.searchParams.get('id') ||
      url.searchParams.get('Id') ||
      url.searchParams.get('ID')

    if (id) return id.trim()
  } catch {
    // no era URL valida
  }

  const matchParametro = limpio.match(/[?&]id=([^&]+)/i)
  if (matchParametro?.[1]) {
    return decodeURIComponent(matchParametro[1]).trim()
  }

  const tokens = limpio.match(/[0-9A-Za-z-]{6,}/g)
  if (tokens && tokens.length > 0) {
    return tokens[tokens.length - 1]
  }

  return limpio
}