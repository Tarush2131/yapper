import type { TimedSegment, TtsBackend } from '../types'

export interface LoadProgress {
  file: string
  loaded: number
  total: number
  /** 0..1 */
  pct: number
}

export interface SpeakHooks {
  /** Real speech length in seconds, known only once the audio exists. */
  onDuration(seconds: number): void
  /** 0..1 through the spoken part of the beat, excluding the trailing pause. */
  onProgress(p: number): void
}

/** What the player needs from a speech backend. */
export interface Narrator {
  readonly kind: TtsBackend
  device?: string
  init(onProgress?: (p: LoadProgress) => void): Promise<void>
  /** Warm the cache for an upcoming beat. Never throws. */
  prefetch(seg: TimedSegment, rate: number): void
  /** Resolves when the beat, including its trailing pause, is finished. */
  speak(seg: TimedSegment, rate: number, hooks: SpeakHooks): Promise<void>
  cancel(): void
  pause(): Promise<void>
  resume(): Promise<void>
  dispose(): void
}
