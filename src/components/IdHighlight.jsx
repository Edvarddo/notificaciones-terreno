export default function IdHighlight({ value }) {
  const texto = String(value ?? '')

  if (texto.length <= 5) {
    return <strong className="id-highlight-text id-highlight-digits">{texto}</strong>
  }

  const inicio = texto.slice(0, -5)
  const fin = texto.slice(-5)

  return (
    <span className="id-highlight-text">
      {inicio}
      <strong className="id-highlight-digits">{fin}</strong>
    </span>
  )
}