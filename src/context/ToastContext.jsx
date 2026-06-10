import { createContext, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const showToast = (
    texto,
    tipo = 'success',
    duracion = 2000
  ) => {
    const id = ++idRef.current

    setToasts((prev) => [
      ...prev,
      {
        id,
        texto,
        tipo,
      },
    ])

    setTimeout(() => {
      setToasts((prev) =>
        prev.filter((toast) => toast.id !== id)
      )
    }, duracion)
  }

  return (
    <ToastContext.Provider
      value={{
        showToast,
      }}
    >
      {children}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.tipo}`}
          >
            {toast.texto}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error(
      'useToast debe usarse dentro de ToastProvider'
    )
  }

  return context
}