import type { Block, Plan, Segment, Settings } from '../types'
import { batchBlocks, blocksForPrompt } from './markdown'
import { continuationNote, systemPrompt, userPrompt } from '../prompts/system'
import { extractJson, validatePlan } from './validate'

const API = 'https://openrouter.ai/api/v1'

export interface ModelOption {
  id: string
  name: string
  promptPrice: number
  contextLength: number
}

/** The models list is public, so the picker works before a key is entered. */
export async function listModels(signal?: AbortSignal): Promise<ModelOption[]> {
  const res = await fetch(`${API}/models`, { signal })
  if (!res.ok) throw new Error(`Could not load the model list (${res.status}).`)
  const json = (await res.json()) as { data?: unknown[] }
  const rows = Array.isArray(json.data) ? json.data : []
  return rows
    .map((r) => {
      const m = r as Record<string, any>
      return {
        id: String(m.id ?? ''),
        name: String(m.name ?? m.id ?? ''),
        promptPrice: Number(m.pricing?.prompt ?? 0),
        contextLength: Number(m.context_length ?? 0),
      }
    })
    .filter((m) => m.id)
    .sort((a, b) => a.id.localeCompare(b.id))
}

function describeHttpError(status: number, body: string): string {
  const detail = body.slice(0, 300)
  switch (status) {
    case 401:
    case 403:
      return 'OpenRouter rejected the API key. Check that it is correct and still active.'
    case 402:
      return 'That OpenRouter account is out of credit for this model.'
    case 429:
      return 'OpenRouter is rate limiting this key. Wait a moment, or pick a different model.'
    default:
      return `OpenRouter returned ${status}. ${detail}`
  }
}

interface ChatArgs {
  apiKey: string
  model: string
  system: string
  user: string
  signal?: AbortSignal
  /** Sent on the first attempt; dropped automatically if the model rejects it. */
  json?: boolean
}

async function chat({ apiKey, model, system, user, signal, json = true }: ChatArgs): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    temperature: 0.8,
    max_tokens: 8000,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  }
  if (json) body.response_format = { type: 'json_object' }

  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': location.origin,
      'X-Title': 'Yapper',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    // Some models reject response_format outright — retry once in plain mode.
    if (json && (res.status === 400 || res.status === 404 || res.status === 422)) {
      return chat({ apiKey, model, system, user, signal, json: false })
    }
    throw new Error(describeHttpError(res.status, text))
  }

  const data = (await res.json()) as Record<string, any>
  if (data.error) throw new Error(String(data.error.message ?? 'OpenRouter reported an error.'))
  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('The model returned an empty response.')
  }
  return content
}

export interface DirectProgress {
  batch: number
  batches: number
  phase: 'directing' | 'done'
}

export interface DirectResult {
  plan: Plan
  warnings: string[]
}

/**
 * Turn parsed blocks into a full shooting script.
 *
 * Long documents are split into batches so no single request runs out of output
 * tokens; each later batch is told how the previous one ended so the script
 * reads as one continuous take.
 */
export async function directScript(
  blocks: Block[],
  settings: Settings,
  onProgress?: (p: DirectProgress) => void,
  signal?: AbortSignal,
): Promise<DirectResult> {
  if (!settings.apiKey.trim()) throw new Error('Add an OpenRouter API key first.')
  if (!blocks.length) throw new Error('There is nothing to narrate.')

  const batches = batchBlocks(blocks)
  const system = systemPrompt(settings.visualEvery, settings.voice)

  const allSegments: Segment[] = []
  const warnings: string[] = []
  let title = ''

  for (let b = 0; b < batches.length; b++) {
    onProgress?.({ batch: b + 1, batches: batches.length, phase: 'directing' })

    const tail = allSegments.slice(-3).map((s) => s.text)
    const continuation = b === 0 ? undefined : continuationNote(title || 'this script', tail)
    const raw = await chat({
      apiKey: settings.apiKey.trim(),
      model: settings.model,
      system,
      user: userPrompt(blocksForPrompt(batches[b]), continuation),
      signal,
    })

    const { plan, warnings: w } = validatePlan(extractJson(raw), blocks, `b${b}s`)
    if (!title) title = plan.title
    allSegments.push(...plan.segments)
    warnings.push(...w.map((x) => `Batch ${b + 1}: ${x}`))
  }

  onProgress?.({ batch: batches.length, batches: batches.length, phase: 'done' })
  return { plan: { title: title || 'Untitled', segments: allSegments }, warnings }
}
