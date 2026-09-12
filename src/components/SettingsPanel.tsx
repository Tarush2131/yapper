import { useEffect, useMemo, useRef, useState } from 'react'
import type { Settings } from '../types'
import { VOICES } from '../lib/voices'
import { listModels, type ModelOption } from '../lib/openrouter'

/**
 * Models we surface as one-tap picks. Any that OpenRouter does not currently
 * serve simply does not render, so this list can go stale without breaking.
 */
const SUGGESTED = [
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-sonnet-5',
  'anthropic/claude-opus-5',
  'google/gemini-2.5-flash',
  'openai/gpt-4o-mini',
  'deepseek/deepseek-chat',
]

interface Props {
  settings: Settings
  onChange(patch: Partial<Settings>): void
}

export function SettingsPanel({ settings, onChange }: Props) {
  const [models, setModels] = useState<ModelOption[]>([])
  const [showKey, setShowKey] = useState(false)
  const [modelsError, setModelsError] = useState('')
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    abort.current = new AbortController()
    listModels(abort.current.signal)
      .then(setModels)
      .catch((e: unknown) => {
        if ((e as Error).name !== 'AbortError') setModelsError('Model list unavailable — type an id.')
      })
    return () => abort.current?.abort()
  }, [])

  const quickPicks = useMemo(() => {
    if (!models.length) return SUGGESTED.slice(0, 3)
    const ids = new Set(models.map((m) => m.id))
    return SUGGESTED.filter((id) => ids.has(id)).slice(0, 6)
  }, [models])

  const keyLooksOff = settings.apiKey.length > 0 && !settings.apiKey.startsWith('sk-or-')

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------ key -- */}
      <section>
        <label className="label" htmlFor="api-key">
          OpenRouter API key
        </label>
        <div className="flex gap-2">
          <input
            id="api-key"
            className="field font-mono text-[13px]"
            type={showKey ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-or-v1-…"
            value={settings.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
          />
          <button
            type="button"
            className="btn-ghost shrink-0 !px-3"
            onClick={() => setShowKey((v) => !v)}
          >
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-white/30">
          Stored in this browser's localStorage and sent only to openrouter.ai. There is no server
          in this app to send it anywhere else.{' '}
          <a
            className="text-accent/70 underline underline-offset-2 hover:text-accent"
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer noopener"
          >
            Get a key
          </a>
        </p>
        {keyLooksOff && (
          <p className="mt-1.5 text-[11px] text-accent3">
            OpenRouter keys usually start with <code>sk-or-</code>. Double-check this one.
          </p>
        )}
      </section>

      {/* ---------------------------------------------------------- model -- */}
      <section>
        <label className="label" htmlFor="model">
          Director model
        </label>
        <input
          id="model"
          className="field font-mono text-[13px]"
          list="model-list"
          spellCheck={false}
          value={settings.model}
          onChange={(e) => onChange({ model: e.target.value })}
          placeholder="provider/model"
        />
        <datalist id="model-list">
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </datalist>
        {quickPicks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickPicks.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ model: id })}
                className="rounded-full border px-2.5 py-1 font-mono text-[10.5px] transition-colors"
                style={{
                  borderColor:
                    settings.model === id ? 'rgba(255,225,77,0.5)' : 'rgba(255,255,255,0.1)',
                  color: settings.model === id ? '#ffe14d' : 'rgba(255,255,255,0.45)',
                }}
              >
                {id.split('/')[1] ?? id}
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-white/30">
          {modelsError || `${models.length || '…'} models available. Any chat model works.`}
        </p>
      </section>

      {/* ---------------------------------------------------------- voice -- */}
      <section>
        <label className="label" htmlFor="voice">
          Host voice
        </label>
        <select
          id="voice"
          className="field"
          value={settings.voice}
          onChange={(e) => onChange({ voice: e.target.value })}
        >
          {VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} ({v.accent}) — {v.character}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[11px] text-white/30">
          The spine of the script. The director still casts other voices for asides and punchlines.
        </p>
      </section>

      {/* --------------------------------------------------------- pacing -- */}
      <section className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="visual-every">
            Visual every {settings.visualEvery}s
          </label>
          <input
            id="visual-every"
            type="range"
            min={8}
            max={30}
            step={1}
            className="w-full accent-accent"
            value={settings.visualEvery}
            onChange={(e) => onChange({ visualEvery: Number(e.target.value) })}
          />
        </div>
        <div>
          <label className="label" htmlFor="rate">
            Speed {settings.rate.toFixed(2)}×
          </label>
          <input
            id="rate"
            type="range"
            min={0.7}
            max={1.5}
            step={0.05}
            className="w-full accent-accent"
            value={settings.rate}
            onChange={(e) => onChange({ rate: Number(e.target.value) })}
          />
        </div>
      </section>

      {/* -------------------------------------------------------- backend -- */}
      <section>
        <span className="label">Speech engine</span>
        <div className="grid grid-cols-2 gap-2">
          <EngineOption
            active={settings.backend === 'kokoro'}
            title="Kokoro-82M"
            note="82M params, on-device, full prosody control. ~86 MB once."
            onClick={() => onChange({ backend: 'kokoro' })}
          />
          <EngineOption
            active={settings.backend === 'webspeech'}
            title="System voice"
            note="Instant, no download. Flatter delivery."
            onClick={() => onChange({ backend: 'webspeech' })}
          />
        </div>
        {settings.backend === 'kokoro' && (
          <div className="mt-3">
            <label className="label" htmlFor="device">
              Compute
            </label>
            <select
              id="device"
              className="field"
              value={settings.device}
              onChange={(e) => onChange({ device: e.target.value as Settings['device'] })}
            >
              <option value="auto">Auto — WebGPU if available</option>
              <option value="webgpu">WebGPU</option>
              <option value="wasm">WASM (q8, lowest memory)</option>
            </select>
          </div>
        )}
      </section>
    </div>
  )
}

function EngineOption({
  active,
  title,
  note,
  onClick,
}: {
  active: boolean
  title: string
  note: string
  onClick(): void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-3.5 py-3 text-left transition-colors"
      style={{
        borderColor: active ? 'rgba(255,225,77,0.45)' : 'rgba(255,255,255,0.1)',
        background: active ? 'rgba(255,225,77,0.06)' : 'transparent',
      }}
    >
      <div className="text-[13px] font-bold" style={{ color: active ? '#ffe14d' : '#fff' }}>
        {title}
      </div>
      <div className="mt-0.5 text-[11px] leading-snug text-white/35">{note}</div>
    </button>
  )
}
