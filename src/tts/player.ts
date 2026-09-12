import type { PlaybackState, TimedPlan, TtsBackend } from '../types'
import { KokoroNarrator } from './kokoro'
import { WebSpeechNarrator } from './webspeech'
import type { LoadProgress, Narrator } from './narrator'

export interface PlayerCallbacks {
  onState(state: PlaybackState): void
  onLoad(progress: LoadProgress): void
}

/**
 * Walks a timed plan beat by beat.
 *
 * Each beat is spoken to completion before the next starts, and the two beats
 * ahead are synthesised in the background so playback never stalls between them.
 */
export class Player {
  private narrator: Narrator | null = null
  private plan: TimedPlan | null = null
  private index = 0
  private token = 0
  private durations: number[] = []
  private rate = 1
  private state: PlaybackState = {
    status: 'idle',
    segmentIndex: 0,
    segmentProgress: 0,
    elapsed: 0,
  }

  constructor(private readonly cb: PlayerCallbacks) {}

  // -------------------------------------------------------------------------

  private emit(patch: Partial<PlaybackState>) {
    this.state = { ...this.state, ...patch }
    this.cb.onState(this.state)
  }

  /**
   * `durations[i]` holds speech only, so the trailing pause is added separately.
   * The estimate already bundles both, which is why the two branches differ.
   */
  private elapsedThrough(index: number, progress: number): number {
    const segments = this.plan?.segments ?? []
    let total = 0
    for (let i = 0; i < index; i++) {
      const measured = this.durations[i]
      total += measured
        ? measured + (segments[i]?.pauseAfterMs ?? 0) / 1000
        : (segments[i]?.estimatedDuration ?? 0)
    }
    const cur = this.durations[index] || segments[index]?.estimatedSpeech || 0
    return total + cur * progress
  }

  // -------------------------------------------------------------------------

  async prepare(
    backend: TtsBackend,
    device: 'auto' | 'webgpu' | 'wasm',
  ): Promise<void> {
    const same = this.narrator?.kind === backend
    if (!same) {
      this.narrator?.dispose()
      this.narrator = backend === 'kokoro' ? new KokoroNarrator(device) : new WebSpeechNarrator()
    }
    this.emit({ status: 'loading-model', error: undefined })
    try {
      await this.narrator!.init((p) => this.cb.onLoad(p))
      this.emit({ status: 'ready' })
    } catch (err) {
      this.emit({ status: 'error', error: err instanceof Error ? err.message : String(err) })
      throw err
    }
  }

  load(plan: TimedPlan, rate: number): void {
    this.cancel()
    this.plan = plan
    this.rate = rate
    this.durations = new Array(plan.segments.length).fill(0)
    this.index = 0
    this.emit({ status: 'ready', segmentIndex: 0, segmentProgress: 0, elapsed: 0 })
  }

  get backendDevice(): string {
    return this.narrator?.device ?? ''
  }

  get currentIndex(): number {
    return this.index
  }

  get status(): PlaybackState['status'] {
    return this.state.status
  }

  // -------------------------------------------------------------------------

  async play(from?: number): Promise<void> {
    if (!this.plan || !this.narrator) return
    if (this.state.status === 'paused' && from === undefined) return this.resume()

    const start = from ?? (this.state.status === 'ended' ? 0 : this.index)
    const token = ++this.token
    this.index = start

    for (let i = start; i < this.plan.segments.length; i++) {
      if (token !== this.token) return
      const seg = this.plan.segments[i]
      this.index = i
      this.emit({
        status: 'buffering',
        segmentIndex: i,
        segmentProgress: 0,
        elapsed: this.elapsedThrough(i, 0),
      })

      for (const j of [i + 1, i + 2]) {
        const next = this.plan.segments[j]
        if (next) this.narrator.prefetch(next, this.rate)
      }

      try {
        await this.narrator.speak(seg, this.rate, {
          onDuration: (d) => {
            this.durations[i] = d
            if (token === this.token) this.emit({ status: 'playing' })
          },
          onProgress: (p) => {
            if (token !== this.token) return
            if (this.state.status === 'paused') return
            this.emit({ segmentProgress: p, elapsed: this.elapsedThrough(i, p) })
          },
        })
      } catch (err) {
        if (token !== this.token) return
        this.emit({ status: 'error', error: err instanceof Error ? err.message : String(err) })
        return
      }
    }

    if (token === this.token) {
      this.emit({ status: 'ended', segmentProgress: 1 })
    }
  }

  async pause(): Promise<void> {
    if (this.state.status !== 'playing' && this.state.status !== 'buffering') return
    await this.narrator?.pause()
    this.emit({ status: 'paused' })
  }

  async resume(): Promise<void> {
    if (this.state.status !== 'paused') return
    await this.narrator?.resume()
    this.emit({ status: 'playing' })
  }

  async toggle(): Promise<void> {
    if (this.state.status === 'playing' || this.state.status === 'buffering') return this.pause()
    if (this.state.status === 'paused') return this.resume()
    return this.play()
  }

  /** Jump to a beat. Keeps playing if it was playing, stays put if it was not. */
  async seek(index: number): Promise<void> {
    if (!this.plan) return
    const target = Math.max(0, Math.min(this.plan.segments.length - 1, index))
    const wasPlaying = this.state.status === 'playing' || this.state.status === 'buffering'
    this.cancel()
    this.index = target
    this.emit({
      segmentIndex: target,
      segmentProgress: 0,
      elapsed: this.elapsedThrough(target, 0),
      status: wasPlaying ? 'buffering' : 'ready',
    })
    if (wasPlaying) await this.play(target)
  }

  /** Stop the run loop without tearing down the model. */
  cancel(): void {
    this.token++
    this.narrator?.cancel()
    void this.narrator?.resume()
  }

  stop(): void {
    this.cancel()
    this.index = 0
    this.emit({ status: 'ready', segmentIndex: 0, segmentProgress: 0, elapsed: 0 })
  }

  dispose(): void {
    this.token++
    this.narrator?.dispose()
    this.narrator = null
  }
}
