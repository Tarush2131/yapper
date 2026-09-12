import { marked, type Token, type Tokens } from 'marked'
import type { Block } from '../types'

/** `Omit` collapses a union; this keeps each member's own fields. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

/**
 * Flatten inline markdown to plain speakable text.
 * Links keep their label, code spans keep their content, decoration is dropped.
 */
export function stripInline(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> label
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*\*|___)(.*?)\1/g, '$2')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cellText(c: { text: string } | string): string {
  return stripInline(typeof c === 'string' ? c : c.text)
}

/**
 * Parse markdown into an ordered block list.
 *
 * Tables and code blocks are kept structured rather than stringified — the stage
 * renders them from this data, so nothing on screen can drift from the source.
 */
export function parseMarkdown(src: string): Block[] {
  const tokens = marked.lexer(src.replace(/\r\n/g, '\n'))
  const blocks: Block[] = []
  let i = 0

  const push = (b: DistributiveOmit<Block, 'i'>) => {
    blocks.push({ ...b, i: i++ } as Block)
  }

  const walk = (list: Token[]) => {
    for (const t of list) {
      switch (t.type) {
        case 'heading': {
          const h = t as Tokens.Heading
          const text = stripInline(h.text)
          if (text) push({ kind: 'heading', depth: h.depth, text })
          break
        }
        case 'paragraph': {
          const p = t as Tokens.Paragraph
          const text = stripInline(p.text)
          if (text) push({ kind: 'paragraph', text })
          break
        }
        case 'text': {
          const text = stripInline((t as Tokens.Text).text ?? '')
          if (text) push({ kind: 'paragraph', text })
          break
        }
        case 'list': {
          const l = t as Tokens.List
          const items = l.items
            .map((it) => stripInline(it.text.split('\n')[0] ?? ''))
            .filter(Boolean)
          if (items.length) push({ kind: 'list', ordered: Boolean(l.ordered), items })
          break
        }
        case 'table': {
          const tb = t as Tokens.Table
          const headers = tb.header.map(cellText)
          const rows = tb.rows.map((r) => r.map(cellText))
          if (headers.length) push({ kind: 'table', headers, rows })
          break
        }
        case 'code': {
          const c = t as Tokens.Code
          if (c.text.trim()) push({ kind: 'code', lang: c.lang || '', code: c.text })
          break
        }
        case 'blockquote': {
          const q = t as Tokens.Blockquote
          const text = stripInline(q.text)
          if (text) push({ kind: 'quote', text })
          break
        }
        case 'html': {
          const text = stripInline((t as Tokens.HTML).text ?? '')
          if (text) push({ kind: 'paragraph', text })
          break
        }
        default:
          break
      }
    }
  }

  walk(tokens)
  return blocks
}

/** Rough word count, used for chunking long documents before they hit the LLM. */
export function wordCount(blocks: Block[]): number {
  return blocks.reduce((n, b) => {
    switch (b.kind) {
      case 'table':
        return n + b.headers.length + b.rows.flat().length
      case 'code':
        return n + b.code.split(/\s+/).length
      case 'list':
        return n + b.items.join(' ').split(/\s+/).length
      default:
        return n + b.text.split(/\s+/).length
    }
  }, 0)
}

/**
 * Split blocks into LLM-sized batches without ever splitting a table or code
 * block away from the paragraph that introduces it.
 */
export function batchBlocks(blocks: Block[], maxWords = 900): Block[][] {
  const batches: Block[][] = []
  let cur: Block[] = []
  let n = 0

  for (const b of blocks) {
    const w = wordCount([b])
    // A heading is a natural seam; break before it if the batch is already full.
    const seam = b.kind === 'heading' && b.depth <= 2
    if (cur.length && (n + w > maxWords || (seam && n > maxWords * 0.55))) {
      batches.push(cur)
      cur = []
      n = 0
    }
    cur.push(b)
    n += w
  }
  if (cur.length) batches.push(cur)
  return batches
}

/** Compact JSON view of blocks, which is what the model actually reads. */
export function blocksForPrompt(blocks: Block[]): string {
  return JSON.stringify(
    blocks.map((b) => {
      switch (b.kind) {
        case 'table':
          return { i: b.i, kind: b.kind, headers: b.headers, rows: b.rows }
        case 'code':
          return { i: b.i, kind: b.kind, lang: b.lang, code: b.code.slice(0, 1200) }
        case 'list':
          return { i: b.i, kind: b.kind, ordered: b.ordered, items: b.items }
        case 'heading':
          return { i: b.i, kind: b.kind, depth: b.depth, text: b.text }
        default:
          return { i: b.i, kind: b.kind, text: b.text }
      }
    }),
    null,
    0,
  )
}
