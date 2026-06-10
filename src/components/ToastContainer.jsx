export default function ToastContainer({ toast }) {
  if (!toast) return null

  return (
    <div className={`toast toast-${toast.tipo}`}>
      {toast.texto}
    </div>
  )
}