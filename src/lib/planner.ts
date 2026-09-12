import type {
  CaptionChunk,
  CaptionWord,
  Plan,
  Segment,
  TimedPlan,
  TimedSegment,
  Visual,
} from '../types'

/** Kokoro at speed 1.0 lands close to this. Used for pre-synthesis planning only. */
const WORDS_PER_MINUTE = 155

/** Subtitles stay punchy: never more than this many words on screen at once. */
const MAX_WORDS_PER_CHUNK = 5
const MAX_CHARS_PER_CHUNK = 30

export function estimateDuration(text: string, speed: number, pauseAfterMs = 0): number {
  const words = text.split(/\s+/).filter(Boolean).length
  const speech = (words / (WORDS_PER_MINUTE * Math.max(0.5, speed))) * 60
  return speech + pauseAfterMs / 1000
}

function isEmphasized(word: string, emphasis: string[]): boolean {
  const bare = word.toLowerCase().replace(/[^\p{L}\p{N}%$.-]/gu, '')
  if (bare.length < 2) return false
  return emphasis.some((e) => {
    const t = e.toLowerCase().replace(/[^\p{L}\p{N}%$.-]/gu, '')
    return t.length > 1 && (t === bare || t.includes(bare) || bare.includes(t))
  })
}

/**
 * Trailing punctuation buys real time in the audio, so a chunk that ends on a
 * period should hold longer than its character count alone suggests.
 */
function chunkWeight(words: string[]): number {
  const text = words.join(' ')
  let w = text.replace(/\s/g, '').length + words.length * 0.6
  if (/[.!?]$/.test(text)) w += 6
  else if (/[,;:—]$/.test(text)) w += 3
  return Math.max(1, w)
}

/**
 * Break a beat into reel-style caption cards and give each one a slice of the
 * beat's duration, weighted by how long it should actually take to say.
 */
export function chunkCaptions(text: string, emphasis: string[]): CaptionChunk[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return []

  const groups: string[][] = []
  let cur: string[] = []

  for (const word of words) {
    const wouldBe = [...cur, word]
    const tooLong =
      wouldBe.length > MAX_WORDS_PER_CHUNK ||
      wouldBe.join(' ').length > MAX_CHARS_PER_CHUNK
    if (cur.length && tooLong) {
      groups.push(cur)
      cur = []
    }
    cur.push(word)
    // Break after sentence-ending punctuation so a card never straddles a full stop.
    if (/[.!?]$/.test(word) && cur.length >= 2) {
      groups.push(cur)
      cur = []
    }
  }
  if (cur.length) groups.push(cur)

  // A single orphaned word reads badly — fold it back into the previous card.
  for (let i = groups.length - 1; i > 0; i--) {
    if (groups[i].length === 1 && groups[i - 1].length < MAX_WORDS_PER_CHUNK) {
      groups[i - 1].push(...groups[i])
      groups.splice(i, 1)
    }
  }

  const weights = groups.map(chunkWeight)
  const total = weights.reduce((a, b) => a + b, 0)

  let acc = 0
  return groups.map((g, i) => {
    const start = acc / total
    acc += weights[i]
    const end = acc / total

    const wordWeights = g.map((w) => Math.max(1, w.replace(/\s/g, '').length + 1))
    const wordTotal = wordWeights.reduce((a, b) => a + b, 0)
    let wAcc = 0
    const wordsOut: CaptionWord[] = g.map((w, j) => {
      const ws = wAcc / wordTotal
      wAcc += wordWeights[j]
      return { text: w, emphasized: isEmphasized(w, emphasis), start: ws, end: wAcc / wordTotal }
    })

    return { words: wordsOut, start, end }
  })
}

/**
 * Words that bind too tightly to what follows. A comma after any of these reads
 * as a grammatical error rather than a beat — "the energy is, still there".
 */
const BINDING = new Set(
  `a an the to of in on at by for with from into onto as is are was were be been being
   am has have had do does did will would can could should may might must not no nor and
   or but that this these those it its his her their our your my than then so very just
   get got make made take took go went about over under up down out off if when while
   below above before after through across around between within without beyond against
   during near per via upon toward towards along among since until unless because though
   each every some any all both either neither one two more most less least such same`
    .split(/\s+/)
    .filter(Boolean),
)

/**
 * Nudge the text so the TTS actually lands the emphasis.
 *
 * Kokoro takes its prosody cues from punctuation, so the one trick that reliably
 * works is a comma before the word that matters. The guards matter as much as the
 * trick: one word per beat, never against a function word, and never so close to
 * the full stop that the sentence trails off mid-phrase.
 */
export function shapeForSpeech(segment: Segment): string {
  const { text, emphasis } = segment
  if (!emphasis.length) return text

  const target = emphasis[0].replace(/[^\p{L}\p{N}%$.-]/gu, '')
  if (target.length < 4) return text

  const words = text.split(' ')
  const idx = words.findIndex((w) => isEmphasized(w, [target]))

  if (idx <= 0) return text // opens the beat — nothing to pause against
  if (idx >= words.length - 2) return text // too close to the end to breathe

  const prev = words[idx - 1]
  if (/[,.;:!?—-]$/.test(prev)) return text // already has a break
  if (BINDING.has(prev.toLowerCase().replace(/[^\p{L}']/gu, ''))) return text

  words[idx - 1] = prev + ','
  return words.join(' ')
}

// ---------------------------------------------------------------------------
// Visual cadence
// ---------------------------------------------------------------------------

const NUMBER_RE = /(\$?\d[\d,]*\.?\d*\s?(?:%|x|×|k|m|bn|b|million|billion|percent)?)/i

/**
 * Build a visual out of a beat's own words.
 *
 * Only used when the model left too long a gap; the goal is a screen that looks
 * deliberate rather than a diagram that claims more than the text supports.
 */
function fallbackVisual(segment: Segment): Visual | null {
  const text = segment.text

  const num = text.match(NUMBER_RE)
  if (num && num[1].replace(/\D/g, '').length >= 1 && /[%x×kmb]|\d{3,}/i.test(num[1])) {
    const label = text
      .replace(num[1], '')
      .replace(/\s{2,}/g, ' ')
      .replace(/^[^\p{L}]+/u, '')
      .trim()
    return {
      type: 'stat',
      value: num[1].trim(),
      label: label.split(/(?<=[.!?])\s/)[0]?.slice(0, 60) ?? '',
    }
  }

  const clauses = text
    .split(/[,;:]|\s—\s|\s-\s/)
    .map((c) => c.trim().replace(/[.!?]+$/, ''))
    .filter((c) => c.split(/\s+/).length >= 2 && c.length >= 8 && c.length <= 44)

  if (clauses.length >= 2) {
    return { type: 'bullets', items: clauses.slice(0, 3) }
  }

  const sentence = text.split(/(?<=[.!?])\s/)[0]?.trim() ?? text
  if (sentence.length >= 12 && sentence.length <= 150) {
    return { type: 'quote', text: sentence }
  }
  return null
}

/**
 * Guarantee the screen changes on a regular beat.
 *
 * The model is asked for a visual every `visualEvery` seconds. This is the
 * backstop: if the accumulated speech since the last visual crosses the hard
 * ceiling, a visual is derived locally. Table and code beats are exempt — the
 * rule there is deliberately the opposite, their literal visual stays up and
 * nothing abstract is allowed to cover it.
 */
export function enforceVisualCadence(segments: Segment[], visualEvery: number): Segment[] {
  const ceiling = Math.max(visualEvery * 1.4, visualEvery + 6)
  let sinceLast = 0
  let sawAny = false

  return segments.map((s) => {
    const dur = estimateDuration(s.text, s.speed, s.pauseAfterMs)

    if (s.visual) {
      sinceLast = 0
      sawAny = true
      return s
    }

    // Literal content owns the screen while it is being explained.
    if (s.sourceKind === 'table' || s.sourceKind === 'code') {
      sinceLast = 0
      return s
    }

    sinceLast += dur
    if (sinceLast >= ceiling || (!sawAny && sinceLast >= visualEvery)) {
      const v = fallbackVisual(s)
      if (v) {
        sinceLast = 0
        sawAny = true
        return { ...s, visual: v }
      }
    }
    return s
  })
}

/**
 * Table and code beats inherit the visual of the beat that introduced them, so
 * the table stays on screen for the whole explanation instead of flashing once.
 */
export function carryLiteralVisuals(segments: Segment[]): Segment[] {
  let carry: Visual | null = null
  let carryBlock = -1

  return segments.map((s) => {
    const literal = s.sourceKind === 'table' || s.sourceKind === 'code'
    if (!literal) {
      if (s.visual) carry = null
      return s
    }
    if (s.visual && (s.visual.type === 'table' || s.visual.type === 'code')) {
      carry = s.visual
      carryBlock = s.blockIndex
      return s
    }
    if (!s.visual && carry && carryBlock === s.blockIndex) {
      return { ...s, visual: carry }
    }
    return s
  })
}

export function buildTimedPlan(
  plan: Plan,
  visualEvery: number,
  rate: number,
  /** When set, every beat is recast to this voice — one narrator for the take. */
  forceVoice?: string,
): TimedPlan {
  const cast = forceVoice
    ? plan.segments.map((s) => (s.voice === forceVoice ? s : { ...s, voice: forceVoice }))
    : plan.segments
  const withCarry = carryLiteralVisuals(cast)
  const paced = enforceVisualCadence(withCarry, visualEvery)

  const segments: TimedSegment[] = paced.map((s) => {
    const speech = estimateDuration(s.text, s.speed * rate)
    return {
      ...s,
      chunks: chunkCaptions(s.text, s.emphasis),
      estimatedSpeech: speech,
      estimatedDuration: speech + s.pauseAfterMs / 1000,
    }
  })

  return {
    title: plan.title,
    segments,
    estimatedDuration: segments.reduce((a, s) => a + s.estimatedDuration, 0),
  }
}

/** Index of the caption chunk showing at `progress` (0..1) through a beat. */
export function activeChunkIndex(chunks: CaptionChunk[], progress: number): number {
  if (!chunks.length) return -1
  for (let i = 0; i < chunks.length; i++) {
    if (progress < chunks[i].end) return i
  }
  return chunks.length - 1
}

export interface ActiveSection {
  title: string
  points: string[]
  /** Which point the narration has reached, by position within the section. */
  active: number
}

/**
 * The section showing at `index`. Consecutive beats sharing a title are one
 * section; the active point advances with position through it, so the panel
 * tracks the narration without needing a point per beat.
 */
export function sectionAt(segments: TimedSegment[], index: number): ActiveSection | null {
  const here = segments[Math.min(Math.max(index, 0), segments.length - 1)]
  if (!here?.section || !here.points?.length) return null

  let start = index
  while (start > 0 && segments[start - 1]?.section === here.section) start--
  let end = index
  while (end < segments.length - 1 && segments[end + 1]?.section === here.section) end++

  const span = end - start
  const through = span === 0 ? 0 : (index - start) / span
  const active = Math.min(here.points.length - 1, Math.floor(through * here.points.length))
  return { title: here.section, points: here.points, active }
}

/** The visual on screen at `index`, walking back to the last beat that set one. */
export function visualAt(segments: TimedSegment[], index: number): Visual | null {
  for (let i = Math.min(index, segments.length - 1); i >= 0; i--) {
    if (segments[i].visual) return segments[i].visual
  }
  return null
}
