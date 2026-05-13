export function normalizarIdNotificacion(valor) {
  return String(valor ?? '').replace(/\D/g, '').slice(0, 9)
}

export function esIdNotificacionValida(valor) {
  return /^\d{8,9}$/.test(String(valor ?? '').trim())
}

export function validarIdNotificacion(valor) {
  const limpio = normalizarIdNotificacion(valor)

  if (!limpio) {
    return {
      ok: false,
      valor: limpio,
      error: 'La ID de notificacion debe contener 8 o 9 digitos',
    }
  }

  if (!esIdNotificacionValida(limpio)) {
    return {
      ok: false,
      valor: limpio,
      error: 'La ID de notificacion debe contener 8 o 9 digitos',
    }
  }

  return {
    ok: true,
    valor: limpio,
    error: '',
  }
}