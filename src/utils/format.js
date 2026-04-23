export const resaltarUltimos5 = (valor) => {
  const texto = String(valor ?? '')
  if (texto.length <= 5) return { inicio: '', fin: texto }

  return {
    inicio: texto.slice(0, -5),
    fin: texto.slice(-5),
  }
}