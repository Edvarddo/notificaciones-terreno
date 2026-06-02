import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AuthGate from './components/AuthGate'
import MonitoreoLive from './pages/MonitoreoLive'

const esMonitoreoPublico = /^\/monitoreo-publico\/?$/i.test(window.location.pathname)

function PublicMonitorApp() {
  const hoy = new Date()
  const y = hoy.getFullYear()
  const m = String(hoy.getMonth() + 1).padStart(2, '0')
  const d = String(hoy.getDate()).padStart(2, '0')
  const fechaCertificacion = `${y}-${m}-${d}`

  return (
    <MonitoreoLive
      fechaCertificacion={fechaCertificacion}
      cargaId={null}
      soloLectura
      esperandoCargaActiva={false}
    />
  )
}

const rootElement = document.getElementById('root')
const root =
  globalThis.__NOTIFICACIONES_APP_ROOT__ || createRoot(rootElement)

globalThis.__NOTIFICACIONES_APP_ROOT__ = root

root.render(
  esMonitoreoPublico ? (
    <PublicMonitorApp />
  ) : (
    <AuthGate>
      <App />
    </AuthGate>
  ),
)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    root.unmount()
    delete globalThis.__NOTIFICACIONES_APP_ROOT__
  })
}

// Register service worker (basic)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {})
  })
}
