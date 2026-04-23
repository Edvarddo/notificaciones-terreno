export default function IdHighlight({ value }) {
  const texto = String(value ?? '')

  if (texto.length <= 5) {
    return <strong>{texto}</strong>
  }

  const inicio = texto.slice(0, -5)
  const fin = texto.slice(-5)

  return (
    <>
      {inicio}
      <strong>{fin}</strong>
    </>
  )
}