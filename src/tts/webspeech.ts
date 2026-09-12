import type { TimedSegment } from '../types'
import { estimateDuration, shapeForSpeech } from '../lib/planner'
import type { LoadProgress, Narrator, SpeakHooks } from './narrator'

/**
 * Fallback narrator built on the browser's own speech synthesis.
 *
 * It exists so the app is usable before the 86 MB Kokoro download finishes, and
 * on machines where WASM SIMD is unavailable. Delivery is noticeably flatter —
 * the platform exposes only rate, pitch and volume, and pitch there is a coarse
 * 0..2 scale rather than cents.
 */
export class WebSpeechNarrator implements Narrator {
  readonly kind = 'webspeech' as const
  device = 'system'

  private voices: SpeechSynthesisVoice[] = []
  private current: SpeechSynthesisUtterance | null = null
  private resolveCurrent: (() => void) | null = null
  private pauseTimer = 0
  private raf = 0
  private pausedAt = 0
  private pausedTotal = 0

  async init(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (!('speechSynthesis' in window)) {
      throw new Error('This browser has no speech synthesis available.')
    }
    this.voices = await loadVoices()
    onProgress?.({ file: '', loaded: 1, total: 1, pct: 1 })
  }

  prefetch(): void {
    /* nothing to warm — synthesis is synchronous at the platform level */
  }

  /** Best-effort match from a Kokoro voice id to something installed locally. */
  private pick(kokoroVoice: string): SpeechSynthesisVoice | undefined {
    if (!this.voices.length) return undefined
    const british = kokoroVoice.startsWith('b')
    const lang = british ? 'en-gb' : 'en-us'
    const pool = this.voices.filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)))
    const exact = pool.filter((v) => v.lang.toLowerCase() === lang)
    const scope = exact.length ? exact : pool

    // Kokoro ids encode gender in the second character (af_/am_/bf_/bm_).
    const wantsFemale = kokoroVoice[1] === 'f'
    const hint = wantsFemale
      ? /female|samantha|zira|aria|jenny|libby|sonia|karen|moira|fiona/i
      : /male|david|guy|ryan|george|daniel|alex|fred/i
    return scope.find((v) => hint.test(v.name)) ?? scope[0] ?? this.voices[0]
  }

  speak(seg: TimedSegment, rate: number, hooks: SpeakHooks): Promise<void> {
    return new Promise<void>((resolve) => {
      const text = shapeForSpeech(seg)
      const u = new SpeechSynthesisUtterance(text)
      const voice = this.pick(seg.voice)
      if (voice) {
        u.voice = voice
        u.lang = voice.lang
      }
      u.rate = Math.min(2, Math.max(0.5, seg.speed * rate))
      u.pitch = Math.min(2, Math.max(0, Math.pow(2, seg.pitchCents / 1200)))
      u.volume = Math.min(1, Math.max(0, seg.gain * 0.85))

      const estimate = estimateDuration(text, u.rate)
      hooks.onDuration(estimate)

      const startedAt = performance.now()
      this.pausedTotal = 0
      this.pausedAt = 0
      let charProgress = 0

      const tick = () => {
        if (this.current !== u) return
        const now = this.pausedAt ? this.pausedAt : performance.now()
        const elapsed = (now - startedAt - this.pausedTotal) / 1000
        // Boundary events are more truthful than the clock; prefer them when present.
        const p = Math.max(charProgress, Math.min(0.99, elapsed / estimate))
        hooks.onProgress(p)
        this.raf = requestAnimationFrame(tick)
      }

      u.onboundary = (e) => {
        if (text.length > 0) charProgress = Math.min(0.99, e.charIndex / text.length)
      }

      const finish = () => {
        if (this.current !== u) return
        cancelAnimationFrame(this.raf)
        this.current = null
        hooks.onProgress(1)
        this.pauseTimer = window.setTimeout(() => {
          this.resolveCurrent = null
          resolve()
        }, seg.pauseAfterMs)
      }
      u.onend = finish
      u.onerror = finish

      this.resolveCurrent = resolve
      this.current = u
      window.speechSynthesis.speak(u)
      this.raf = requestAnimationFrame(tick)
    })
  }

  cancel(): void {
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.pauseTimer)
    const u = this.current
    const settle = this.resolveCurrent
    this.current = null
    this.resolveCurrent = null
    if (u) {
      u.onend = null
      u.onerror = null
      u.onboundary = null
    }
    window.speechSynthesis.cancel()
    settle?.()
  }

  async pause(): Promise<void> {
    if (!this.pausedAt) this.pausedAt = performance.now()
    window.speechSynthesis.pause()
  }

  async resume(): Promise<void> {
    if (this.pausedAt) {
      this.pausedTotal += performance.now() - this.pausedAt
      this.pausedAt = 0
    }
    window.speechSynthesis.resume()
  }

  dispose(): void {
    this.cancel()
  }
}

/** Chrome populates the voice list asynchronously on first call. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices()
    if (existing.length) return resolve(existing)

    const timer = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500)
    window.speechSynthesis.addEventListener(
      'voiceschanged',
      () => {
        window.clearTimeout(timer)
        resolve(window.speechSynthesis.getVoices())
      },
      { once: true },
    )
  })
}
