export function escaparValorCsv(valor) {
  const texto = String(valor ?? '')
  const textoSeguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto

  if (textoSeguro.includes(',') || textoSeguro.includes('"') || textoSeguro.includes('\n') || textoSeguro.includes('\r')) {
    return `"${textoSeguro.replace(/"/g, '""')}"`
  }

  return textoSeguro
}