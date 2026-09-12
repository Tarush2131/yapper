import type { TimedSegment } from '../types'
import { shapeForSpeech } from '../lib/planner'
import type { LoadProgress, Narrator, SpeakHooks } from './narrator'

const MAX_CACHED = 64

/** Playback rate multiplier for a pitch shift expressed in cents. */
const pitchRatio = (cents: number) => Math.pow(2, cents / 1200)

type Pending = {
  resolve: (v: { pcm: Float32Array; sampleRate: number }) => void
  reject: (e: Error) => void
}

/**
 * Kokoro-82M narrator.
 *
 * Prosody is assembled from three real controls rather than one:
 *   - tempo comes from Kokoro's own `speed`,
 *   - pitch comes from `detune` on the playback node, with `speed` divided by the
 *     same ratio so the shift does not also change how long the beat takes,
 *   - level comes from a per-beat gain node into a shared compressor.
 *
 * The net effect is that the model can score pitch and tempo independently, which
 * an 82M-parameter TTS does not otherwise let you do.
 */
export class KokoroNarrator implements Narrator {
  readonly kind = 'kokoro' as const

  private worker: Worker | null = null
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private ready: Promise<void> | null = null
  private readonly pending = new Map<string, Pending>()
  private readonly cache = new Map<string, AudioBuffer>()
  private readonly inflight = new Map<string, Promise<AudioBuffer>>()
  private source: AudioBufferSourceNode | null = null
  private resolveCurrent: (() => void) | null = null
  private raf = 0
  private seq = 0

  device = 'unknown'

  constructor(private readonly deviceHint: 'auto' | 'webgpu' | 'wasm' = 'auto') {}

  // -------------------------------------------------------------------------

  init(onProgress?: (p: LoadProgress) => void): Promise<void> {
    if (this.ready) return this.ready

    this.ready = new Promise<void>((resolve, reject) => {
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
      this.worker = worker

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data as Record<string, any>
        switch (msg.type) {
          case 'progress':
            onProgress?.({ file: msg.file, loaded: msg.loaded, total: msg.total, pct: msg.pct })
            break
          case 'ready':
            this.device = msg.device
            onProgress?.({ file: '', loaded: 1, total: 1, pct: 1 })
            resolve()
            break
          case 'audio': {
            const p = this.pending.get(msg.id)
            if (p) {
              this.pending.delete(msg.id)
              p.resolve({ pcm: msg.pcm as Float32Array, sampleRate: msg.sampleRate as number })
            }
            break
          }
          case 'error': {
            const err = new Error(msg.message)
            if (msg.id && this.pending.has(msg.id)) {
              this.pending.get(msg.id)!.reject(err)
              this.pending.delete(msg.id)
            } else {
              reject(err)
            }
            break
          }
        }
      }

      worker.onerror = (e) => reject(new Error(e.message || 'The speech worker failed to start.'))
      worker.postMessage({ type: 'init', device: this.deviceHint })
    })

    return this.ready
  }

  /** Created lazily so it is always born inside a user gesture. */
  private audio(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()

      // A gentle compressor keeps beat-to-beat gain changes from feeling lumpy.
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -18
      comp.knee.value = 24
      comp.ratio.value = 3
      comp.attack.value = 0.004
      comp.release.value = 0.18

      const master = this.ctx.createGain()
      master.gain.value = 1.1
      master.connect(comp)
      comp.connect(this.ctx.destination)
      this.master = master
    }
    return this.ctx
  }

  // -------------------------------------------------------------------------

  /** Everything that changes the rendered waveform has to be in the key. */
  private key(seg: TimedSegment, kokoroSpeed: number): string {
    return `${seg.voice}|${kokoroSpeed.toFixed(3)}|${seg.pauseAfterMs}|${shapeForSpeech(seg)}`
  }

  private plan(seg: TimedSegment, rate: number) {
    const rho = pitchRatio(seg.pitchCents)
    const target = seg.speed * rate
    const kokoroSpeed = Math.min(2, Math.max(0.5, target / rho))
    return { rho, kokoroSpeed }
  }

  private async render(seg: TimedSegment, rate: number): Promise<AudioBuffer> {
    const { rho, kokoroSpeed } = this.plan(seg, rate)
    const key = this.key(seg, kokoroSpeed)

    const cached = this.cache.get(key)
    if (cached) return cached

    const running = this.inflight.get(key)
    if (running) return running

    const job = (async () => {
      await this.init()
      const id = `r${this.seq++}`
      const { pcm, sampleRate } = await new Promise<{ pcm: Float32Array; sampleRate: number }>(
        (resolve, reject) => {
          this.pending.set(id, { resolve, reject })
          this.worker!.postMessage({
            type: 'synth',
            id,
            text: shapeForSpeech(seg),
            voice: seg.voice,
            speed: kokoroSpeed,
          })
        },
      )

      const ctx = this.audio()
      // Pad the trailing silence here so pauses ride the audio clock and freeze
      // correctly when the context is suspended. Scaled by rho because detune
      // shortens the padding along with the speech.
      const pad = Math.round((seg.pauseAfterMs / 1000) * rho * sampleRate)
      const buffer = ctx.createBuffer(1, pcm.length + pad, sampleRate)
      buffer.getChannelData(0).set(pcm, 0)

      if (this.cache.size >= MAX_CACHED) {
        const oldest = this.cache.keys().next().value
        if (oldest) this.cache.delete(oldest)
      }
      this.cache.set(key, buffer)
      return buffer
    })()

    this.inflight.set(key, job)
    try {
      return await job
    } finally {
      this.inflight.delete(key)
    }
  }

  prefetch(seg: TimedSegment, rate: number): void {
    void this.render(seg, rate).catch(() => undefined)
  }

  // -------------------------------------------------------------------------

  async speak(seg: TimedSegment, rate: number, hooks: SpeakHooks): Promise<void> {
    const buffer = await this.render(seg, rate)
    const ctx = this.audio()
    if (ctx.state === 'suspended') await ctx.resume()

    const { rho } = this.plan(seg, rate)
    const padSeconds = seg.pauseAfterMs / 1000
    const speechSeconds = Math.max(0.05, buffer.duration / rho - padSeconds)
    hooks.onDuration(speechSeconds)

    return new Promise<void>((resolve) => {
      const gain = ctx.createGain()
      gain.gain.value = seg.gain
      gain.connect(this.master!)

      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.detune.value = seg.pitchCents
      src.connect(gain)
      this.source = src

      const startedAt = ctx.currentTime
      const tick = () => {
        if (this.source !== src) return
        const elapsed = ctx.currentTime - startedAt
        hooks.onProgress(Math.min(1, elapsed / speechSeconds))
        this.raf = requestAnimationFrame(tick)
      }

      src.onended = () => {
        if (this.source !== src) return
        cancelAnimationFrame(this.raf)
        this.source = null
        this.resolveCurrent = null
        gain.disconnect()
        hooks.onProgress(1)
        resolve()
      }

      // Held so a seek can settle this promise instead of leaking it.
      this.resolveCurrent = () => {
        gain.disconnect()
        resolve()
      }

      src.start()
      this.raf = requestAnimationFrame(tick)
    })
  }

  cancel(): void {
    cancelAnimationFrame(this.raf)
    const src = this.source
    const settle = this.resolveCurrent
    this.source = null
    this.resolveCurrent = null
    if (src) {
      src.onended = null
      try {
        src.stop()
      } catch {
        /* already stopped */
      }
      src.disconnect()
    }
    settle?.()
  }

  async pause(): Promise<void> {
    if (this.ctx && this.ctx.state === 'running') await this.ctx.suspend()
  }

  async resume(): Promise<void> {
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume()
  }

  dispose(): void {
    this.cancel()
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    this.cache.clear()
    void this.ctx?.close()
    this.ctx = null
  }
}
