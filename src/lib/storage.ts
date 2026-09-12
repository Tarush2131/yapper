import type { Settings } from '../types'
import { DEFAULT_VOICE } from './voices'

const KEY = 'yapper.settings.v1'
const DRAFT_KEY = 'yapper.draft.v1'

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'anthropic/claude-haiku-4.5',
  voice: DEFAULT_VOICE,
  backend: 'kokoro',
  visualEvery: 15,
  singleVoice: true,
  rate: 1,
  device: 'auto',
}

/**
 * Settings live in localStorage and nowhere else. The API key is sent straight
 * from the browser to OpenRouter — there is no backend in this app to send it to.
 */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<Settings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* private browsing, quota, or a blocked origin — not worth interrupting for */
  }
}

export function clearKey(): void {
  const s = loadSettings()
  saveSettings({ ...s, apiKey: '' })
}

export function loadDraft(): string {
  try {
    return localStorage.getItem(DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveDraft(md: string): void {
  try {
    localStorage.setItem(DRAFT_KEY, md)
  } catch {
    /* ignore */
  }
}
