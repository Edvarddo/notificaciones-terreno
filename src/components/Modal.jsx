export default function Modal({ children, onClose }) {
  return (
    <div className="dialogo-overlay" onClick={onClose}>
      <div className="dialogo-codigos" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}