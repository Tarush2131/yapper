import type { Block, Plan, Segment, SourceKind, Visual } from '../types'
import { DEFAULT_VOICE, isVoice } from './voices'

const clamp = (n: unknown, lo: number, hi: number, fallback: number): number => {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(hi, Math.max(lo, v))
}

const str = (v: unknown, max = 400): string =>
  typeof v === 'string' ? v.slice(0, max).trim() : ''

const strArray = (v: unknown, maxItems: number, maxLen = 80): string[] =>
  Array.isArray(v)
    ? v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems)
    : []

const SOURCE_KINDS: SourceKind[] = ['prose', 'table', 'code', 'list', 'heading']

/** Remove anything the TTS would either choke on or spell out loud. */
export function cleanSpoken(raw: string): string {
  return raw
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/[*_`#>|]/g, ' ')
    .replace(/[[\]{}<>]/g, ' ')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function validateVisual(raw: unknown, blocks: Block[], kind: SourceKind): Visual | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as Record<string, unknown>
  const type = str(v.type, 20)

  const blockAt = (idx: unknown): Block | undefined => {
    const n = typeof idx === 'number' ? idx : Number(idx)
    return Number.isInteger(n) ? blocks.find((b) => b.i === n) : undefined
  }

  // --- Literal visuals: hydrated from the parsed source, never from the model.
  if (type === 'table') {
    const b = blockAt(v.blockIndex)
    if (!b || b.kind !== 'table') return null
    const hl = (v.highlight ?? null) as Record<string, unknown> | null
    const row = hl && Number.isInteger(Number(hl.row)) ? Number(hl.row) : undefined
    const col = hl && Number.isInteger(Number(hl.col)) ? Number(hl.col) : undefined
    const hasHighlight = row !== undefined || col !== undefined
    return {
      type: 'table',
      blockIndex: b.i,
      title: str(v.title, 60) || undefined,
      headers: b.headers,
      rows: b.rows,
      highlight: hasHighlight
        ? {
            row: row !== undefined ? clamp(row, 0, Math.max(0, b.rows.length - 1), 0) : undefined,
            col: col !== undefined ? clamp(col, 0, Math.max(0, b.headers.length - 1), 0) : undefined,
          }
        : undefined,
    }
  }

  if (type === 'code') {
    const b = blockAt(v.blockIndex)
    if (!b || b.kind !== 'code') return null
    const lines = b.code.split('\n').slice(0, 18)
    const hl = Array.isArray(v.highlight)
      ? v.highlight
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n >= 1 && n <= lines.length)
          .slice(0, 6)
      : []
    return {
      type: 'code',
      blockIndex: b.i,
      title: str(v.title, 60) || undefined,
      lang: b.lang,
      lines,
      highlight: hl.length ? hl : undefined,
    }
  }

  // --- Abstract diagrams are never allowed to stand in for literal content.
  if (kind === 'table' || kind === 'code') return null

  switch (type) {
    case 'bullets': {
      const items = strArray(v.items, 4, 48)
      return items.length >= 2
        ? { type: 'bullets', title: str(v.title, 48) || undefined, items }
        : null
    }
    case 'flow': {
      const steps = strArray(v.steps, 5, 40)
      return steps.length >= 2
        ? { type: 'flow', title: str(v.title, 48) || undefined, steps }
        : null
    }
    case 'compare': {
      const l = (v.left ?? {}) as Record<string, unknown>
      const r = (v.right ?? {}) as Record<string, unknown>
      const left = { label: str(l.label, 28), items: strArray(l.items, 4, 40) }
      const right = { label: str(r.label, 28), items: strArray(r.items, 4, 40) }
      return left.label && right.label && (left.items.length || right.items.length)
        ? { type: 'compare', title: str(v.title, 48) || undefined, left, right }
        : null
    }
    case 'stat': {
      const value = str(v.value, 14)
      return value
        ? {
            type: 'stat',
            value,
            label: str(v.label, 60),
            caption: str(v.caption, 90) || undefined,
          }
        : null
    }
    case 'timeline': {
      const points = Array.isArray(v.points)
        ? v.points
            .map((p) => {
              const o = (p ?? {}) as Record<string, unknown>
              return { when: str(o.when, 20), what: str(o.what, 48) }
            })
            .filter((p) => p.when || p.what)
            .slice(0, 4)
        : []
      return points.length >= 2
        ? { type: 'timeline', title: str(v.title, 48) || undefined, points }
        : null
    }
    case 'quote': {
      const text = str(v.text, 160)
      return text
        ? { type: 'quote', text, attribution: str(v.attribution, 40) || undefined }
        : null
    }
    default:
      return null
  }
}

/** Keep only emphasis words that actually occur in the beat. */
/**
 * The section header and its talking points. Points are capped at five because
 * the panel is meant to be glanceable, not a second script.
 */
function sectionOf(s: Record<string, unknown>): { section?: string; points?: string[] } {
  const section = str(s.section, 60)
  if (!section) return {}
  const points = strArray(s.points, 5, 70)
  return points.length ? { section, points } : { section }
}

function validateEmphasis(raw: unknown, text: string): string[] {
  const lower = text.toLowerCase()
  return strArray(raw, 3, 24).filter((w) => {
    const clean = w.toLowerCase().replace(/[^\p{L}\p{N}%$.-]/gu, '')
    return clean.length > 1 && lower.includes(clean)
  })
}

export interface ValidateResult {
  plan: Plan
  warnings: string[]
}

/** Coerce a raw model response into a Plan we are willing to play. */
export function validatePlan(raw: unknown, blocks: Block[], idPrefix = 's'): ValidateResult {
  const warnings: string[] = []
  const o = (raw ?? {}) as Record<string, unknown>
  const rawSegments = Array.isArray(o.segments) ? o.segments : []
  if (!rawSegments.length) throw new Error('The model returned no segments.')

  const validBlockIndexes = new Set(blocks.map((b) => b.i))
  const segments: Segment[] = []

  rawSegments.forEach((rs, n) => {
    const s = (rs ?? {}) as Record<string, unknown>
    const text = cleanSpoken(str(s.text, 600))
    if (text.split(/\s+/).filter(Boolean).length < 2) {
      warnings.push(`Dropped an empty beat at position ${n}.`)
      return
    }

    const kindRaw = str(s.sourceKind, 12) as SourceKind
    const sourceKind: SourceKind = SOURCE_KINDS.includes(kindRaw) ? kindRaw : 'prose'

    let blockIndex = Number(s.blockIndex)
    if (!validBlockIndexes.has(blockIndex)) blockIndex = blocks[0]?.i ?? 0

    const voiceRaw = str(s.voice, 24)
    const voice = isVoice(voiceRaw) ? voiceRaw : DEFAULT_VOICE
    if (voiceRaw && !isVoice(voiceRaw)) warnings.push(`Unknown voice "${voiceRaw}" at beat ${n}.`)

    const visual = validateVisual(s.visual, blocks, sourceKind)
    if (s.visual && !visual) warnings.push(`Dropped an invalid visual at beat ${n}.`)

    segments.push({
      id: `${idPrefix}${n}`,
      text,
      sourceKind,
      blockIndex,
      voice,
      speed: clamp(s.speed, 0.7, 1.4, 1),
      pitchCents: clamp(s.pitchCents, -400, 400, 0),
      gain: clamp(s.gain, 0.6, 1.4, 1),
      pauseAfterMs: clamp(s.pauseAfterMs, 0, 2000, 160),
      emphasis: validateEmphasis(s.emphasis, text),
      visual,
      // Points without a section have nothing to hang off, so both or neither.
      ...sectionOf(s),
    })
  })

  if (!segments.length) throw new Error('Every beat the model returned was unusable.')

  return {
    plan: { title: str(o.title, 90) || 'Untitled', segments },
    warnings,
  }
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return undefined
  }
}

/**
 * Close whatever the model left open. Models that hit a token limit mid-array
 * still contain a long run of perfectly good beats; this salvages them.
 */
function repairTruncated(s: string): string {
  let inString = false
  let escaped = false
  let depth = 0
  let lastSafe = -1

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === '\\') escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{' || c === '[') depth++
    else if (c === '}' || c === ']') {
      depth--
      // A closed object sitting directly inside the segments array is a safe cut.
      if (c === '}' && depth === 2) lastSafe = i
    }
  }

  let body = inString && lastSafe > 0 ? s.slice(0, lastSafe + 1) : s
  body = body.replace(/,\s*$/, '')

  // Recompute the open brackets that survived the cut, then close them.
  const closers: string[] = []
  let str2 = false
  let esc2 = false
  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (str2) {
      if (esc2) esc2 = false
      else if (c === '\\') esc2 = true
      else if (c === '"') str2 = false
      continue
    }
    if (c === '"') str2 = true
    else if (c === '{') closers.push('}')
    else if (c === '[') closers.push(']')
    else if (c === '}' || c === ']') closers.pop()
  }
  return body + closers.reverse().join('')
}

/**
 * Pull a JSON object out of a response that may be fenced, prefixed with
 * chatter, or cut off mid-array.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const direct = tryParse(trimmed)
  if (direct !== undefined) return direct

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) {
    const parsed = tryParse(fence[1].trim())
    if (parsed !== undefined) return parsed
  }

  const start = trimmed.indexOf('{')
  if (start === -1) throw new Error('There was no JSON object in the model response.')
  const slice = trimmed.slice(start)

  const parsed = tryParse(slice)
  if (parsed !== undefined) return parsed

  const salvaged = tryParse(repairTruncated(slice))
  if (salvaged !== undefined) return salvaged

  throw new Error('The model response was not valid JSON.')
}
