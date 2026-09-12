/** Shared shapes for the whole pipeline: markdown -> plan -> speech -> stage. */

// ---------------------------------------------------------------------------
// Parsed source document
// ---------------------------------------------------------------------------

export type Block =
  | { i: number; kind: 'heading'; depth: number; text: string }
  | { i: number; kind: 'paragraph'; text: string }
  | { i: number; kind: 'list'; ordered: boolean; items: string[] }
  | { i: number; kind: 'table'; headers: string[]; rows: string[][] }
  | { i: number; kind: 'code'; lang: string; code: string }
  | { i: number; kind: 'quote'; text: string }

/** Blocks whose content must never be replaced by an abstract diagram. */
export type LiteralKind = 'table' | 'code'

// ---------------------------------------------------------------------------
// Visuals
// ---------------------------------------------------------------------------

export type Visual =
  | { type: 'bullets'; title?: string; items: string[] }
  | { type: 'flow'; title?: string; steps: string[] }
  | {
      type: 'compare'
      title?: string
      left: { label: string; items: string[] }
      right: { label: string; items: string[] }
    }
  | { type: 'stat'; value: string; label: string; caption?: string }
  | { type: 'timeline'; title?: string; points: { when: string; what: string }[] }
  | { type: 'quote'; text: string; attribution?: string }
  /** Hydrated client-side from the parsed block so cell text is never hallucinated. */
  | {
      type: 'table'
      blockIndex: number
      title?: string
      headers?: string[]
      rows?: string[][]
      highlight?: { row?: number; col?: number }
    }
  | {
      type: 'code'
      blockIndex: number
      title?: string
      lang?: string
      lines?: string[]
      highlight?: number[]
    }

export type VisualType = Visual['type']

/** Diagrams the model may invent. Literal visuals (table/code) are hydrated, not invented. */
export const ABSTRACT_VISUALS: VisualType[] = [
  'bullets',
  'flow',
  'compare',
  'stat',
  'timeline',
  'quote',
]

// ---------------------------------------------------------------------------
// Speech plan (what the LLM returns, after validation)
// ---------------------------------------------------------------------------

export type SourceKind = 'prose' | 'table' | 'code' | 'list' | 'heading'

/** A single spoken beat, plus the full prosody direction for it. */
export interface Segment {
  id: string
  /** Spoken text. Already rewritten for the ear, not the eye. */
  text: string
  /** Which block this came from — drives the "no diagram over literal content" rule. */
  sourceKind: SourceKind
  blockIndex: number
  /** Kokoro voice id, e.g. `af_heart`. */
  voice: string
  /** 0.75 slow and deliberate — 1.35 rapid-fire. */
  speed: number
  /** Pitch shift in cents, duration-preserving. -300 grave, +300 bright. */
  pitchCents: number
  /** Linear gain, 0.7 quiet aside — 1.3 punch. */
  gain: number
  /** Silence held after this beat, in ms. */
  pauseAfterMs: number
  /** Words to hit hard. Drives both caption styling and text shaping. */
  emphasis: string[]
  visual: Visual | null
  /**
   * The chapter this beat sits in. Consecutive beats sharing a title are one
   * section, and the stage keeps that section's points on screen throughout —
   * the laid-back "what we are actually covering" layer next to the diagram.
   */
  section?: string
  /** 2–5 high-level points for the section. Repeated on every beat within it. */
  points?: string[]
}

export interface Plan {
  title: string
  segments: Segment[]
}

// ---------------------------------------------------------------------------
// Timed plan (after client-side chunking + duration estimation)
// ---------------------------------------------------------------------------

export interface CaptionWord {
  text: string
  emphasized: boolean
  /** Fraction of the parent chunk's duration where this word starts / ends. */
  start: number
  end: number
}

export interface CaptionChunk {
  words: CaptionWord[]
  /** Fraction of the parent segment's duration. */
  start: number
  end: number
}

export interface TimedSegment extends Segment {
  chunks: CaptionChunk[]
  /** Estimated seconds of speech alone; replaced by the real duration once rendered. */
  estimatedSpeech: number
  /** `estimatedSpeech` plus the trailing pause. Used for totals and scrub widths. */
  estimatedDuration: number
}

export interface TimedPlan {
  title: string
  segments: TimedSegment[]
  /** Sum of estimates, in seconds. */
  estimatedDuration: number
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export type EngineStatus =
  | 'idle'
  | 'loading-model'
  | 'ready'
  | 'buffering'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error'

export interface PlaybackState {
  status: EngineStatus
  segmentIndex: number
  /** Progress through the current segment, 0..1. */
  segmentProgress: number
  /** Seconds elapsed across the whole run. */
  elapsed: number
  error?: string
}

export type TtsBackend = 'kokoro' | 'webspeech'

export interface Settings {
  apiKey: string
  model: string
  voice: string
  backend: TtsBackend
  /** Target seconds between visuals. */
  visualEvery: number
  /** Hold one voice for the whole take instead of casting per beat. */
  singleVoice: boolean
  /** Global speed multiplier applied on top of per-segment speed. */
  rate: number
  device: 'auto' | 'webgpu' | 'wasm'
}
