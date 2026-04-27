// Minimal IndexedDB wrapper for pending operations
const DB_NAME = 'notificaciones-offline'
const STORE = 'pendientes'

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function agregarOperacionPendiente(op) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const now = Date.now()
    const item = { ...op, attempts: 0, createdAt: now, lastTriedAt: null, lastError: null }
    const r = store.add(item)
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export async function obtenerOperacionesPendientes() {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const store = tx.objectStore(STORE)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function eliminarOperacionPendiente(id) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function actualizarOperacionPendiente(id, updates) {
  const db = await abrirDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const existing = getReq.result
      if (!existing) return resolve(null)
      const updated = { ...existing, ...updates }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve(updated)
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}
