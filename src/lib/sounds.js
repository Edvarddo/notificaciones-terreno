// Simple WebAudio-based beep utility (no external assets)
let audioCtx = null
export function playBeep({ frequency = 1000, duration = 120, volume = 0.15 } = {}) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = audioCtx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(frequency, ctx.currentTime)
    g.gain.setValueAtTime(volume, ctx.currentTime)
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    setTimeout(() => {
      o.stop()
      o.disconnect()
      g.disconnect()
    }, duration)
  } catch (e) {
    // ignore
  }
}
