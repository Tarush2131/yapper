/**
 * Kokoro-82M voice catalogue.
 *
 * Each entry carries a short character note; these notes are handed to the LLM
 * so it can cast a voice per beat instead of picking an opaque id.
 */
export interface VoiceMeta {
  id: string
  label: string
  accent: 'US' | 'UK'
  character: string
}

export const VOICES: VoiceMeta[] = [
  { id: 'af_heart', label: 'Heart', accent: 'US', character: 'warm, bright, high energy — the default host' },
  { id: 'af_bella', label: 'Bella', accent: 'US', character: 'rich and expressive, great for a dramatic turn' },
  { id: 'af_nicole', label: 'Nicole', accent: 'US', character: 'soft, close-mic, conspiratorial aside' },
  { id: 'af_aoede', label: 'Aoede', accent: 'US', character: 'clean and even, good for dense explanation' },
  { id: 'af_kore', label: 'Kore', accent: 'US', character: 'confident, declarative, lands a verdict' },
  { id: 'af_sarah', label: 'Sarah', accent: 'US', character: 'friendly and measured, easy to follow' },
  { id: 'af_sky', label: 'Sky', accent: 'US', character: 'light and quick, good for rapid lists' },
  { id: 'af_nova', label: 'Nova', accent: 'US', character: 'crisp newsreader clarity' },
  { id: 'af_alloy', label: 'Alloy', accent: 'US', character: 'neutral and flat — deadpan punchlines' },
  { id: 'af_jessica', label: 'Jessica', accent: 'US', character: 'conversational, slightly wry' },
  { id: 'af_river', label: 'River', accent: 'US', character: 'calm and low key, cools a hot section down' },
  { id: 'am_adam', label: 'Adam', accent: 'US', character: 'grounded male narrator' },
  { id: 'am_michael', label: 'Michael', accent: 'US', character: 'documentary weight' },
  { id: 'am_puck', label: 'Puck', accent: 'US', character: 'playful and punchy, made for hooks' },
  { id: 'am_fenrir', label: 'Fenrir', accent: 'US', character: 'deep and serious, lands a warning' },
  { id: 'am_onyx', label: 'Onyx', accent: 'US', character: 'smooth and low, late-night read' },
  { id: 'am_echo', label: 'Echo', accent: 'US', character: 'airy, reflective' },
  { id: 'am_eric', label: 'Eric', accent: 'US', character: 'brisk and practical' },
  { id: 'am_liam', label: 'Liam', accent: 'US', character: 'young, upbeat' },
  { id: 'bf_emma', label: 'Emma', accent: 'UK', character: 'poised British, adds authority' },
  { id: 'bf_isabella', label: 'Isabella', accent: 'UK', character: 'elegant British, slower cadence' },
  { id: 'bf_alice', label: 'Alice', accent: 'UK', character: 'bright British, quick wit' },
  { id: 'bf_lily', label: 'Lily', accent: 'UK', character: 'gentle British, soft landings' },
  { id: 'bm_george', label: 'George', accent: 'UK', character: 'classic British narrator' },
  { id: 'bm_fable', label: 'Fable', accent: 'UK', character: 'storyteller, leans into suspense' },
  { id: 'bm_daniel', label: 'Daniel', accent: 'UK', character: 'even British, explanatory' },
  { id: 'bm_lewis', label: 'Lewis', accent: 'UK', character: 'gravelly British, heavy emphasis' },
]

export const DEFAULT_VOICE = 'af_heart'

const byId = new Map(VOICES.map((v) => [v.id, v]))

export function isVoice(id: string): boolean {
  return byId.has(id)
}

export function voiceLabel(id: string): string {
  return byId.get(id)?.label ?? id
}

/** Compact casting sheet injected into the system prompt. */
export function voiceSheet(): string {
  return VOICES.map((v) => `${v.id} (${v.accent}) — ${v.character}`).join('\n')
}
