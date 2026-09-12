import { useMemo } from 'react'
import type { Block, Settings } from '../types'
import { parseMarkdown, wordCount } from '../lib/markdown'
import { SAMPLE_MARKDOWN } from '../lib/sample'
import { DECKS, type DeckKey } from '../lib/decks'
import { SettingsPanel } from './SettingsPanel'
import { SparkIcon } from './Icons'

interface Props {
  markdown: string
  settings: Settings
  busy: boolean
  status: string
  error: string
  warnings: string[]
  onMarkdown(md: string): void
  onSettings(patch: Partial<Settings>): void
  onGenerate(): void
  onDemo(deck: DeckKey): void
}

export function Editor({
  markdown,
  settings,
  busy,
  status,
  error,
  warnings,
  onMarkdown,
  onSettings,
  onGenerate,
  onDemo,
}: Props) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown])
  const stats = useMemo(() => summarise(blocks), [blocks])
  const words = useMemo(() => (markdown.trim() ? wordCount(blocks) : 0), [blocks, markdown])
  const ready = Boolean(markdown.trim()) && Boolean(settings.apiKey.trim()) && !busy

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[1240px] flex-col gap-8 px-5 py-8 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[clamp(2.1rem,5.5vw,3.4rem)] leading-[0.95] tracking-tight">
            YAPPER
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/45">
            Paste markdown. An LLM rewrites it the way a person would actually say it out loud,
            scores the delivery beat by beat, and an 82M-parameter voice model performs it — on your
            device, over black, in subtitles you can read from across the room.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="chip">tables get explained, not read</span>
          <span className="chip">a visual every {settings.visualEvery}s</span>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* ------------------------------------------------------- editor -- */}
        <section className="flex min-h-[420px] flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="label !mb-0">Markdown</span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[11px] font-semibold text-white/35 transition-colors hover:text-accent"
                onClick={() => onMarkdown(SAMPLE_MARKDOWN)}
              >
                Load sample
              </button>
              {markdown && (
                <button
                  type="button"
                  className="text-[11px] font-semibold text-white/35 transition-colors hover:text-accent3"
                  onClick={() => onMarkdown('')}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <textarea
            className="field min-h-[380px] flex-1 resize-none font-mono text-[13px] leading-relaxed"
            placeholder={"# Paste anything\n\nHeadings, paragraphs, lists, tables, code — all of it."}
            spellCheck={false}
            value={markdown}
            onChange={(e) => onMarkdown(e.target.value)}
          />

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="chip">{words} words</span>
            {stats.map((s) => (
              <span key={s.label} className="chip">
                {s.count} {s.label}
              </span>
            ))}
            {words > 0 && (
              <span className="chip !text-white/35">
                ≈ {Math.max(1, Math.round((words / 155) * 0.55))} min narrated
              </span>
            )}
          </div>
        </section>

        {/* ----------------------------------------------------- settings -- */}
        <section className="panel h-fit p-5">
          <SettingsPanel settings={settings} onChange={onSettings} />
        </section>
      </div>

      {/* ---------------------------------------------------------- action -- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary !px-6 !py-3" disabled={!ready} onClick={onGenerate}>
            {busy ? (
              <>
                <span className="anim-spin h-4 w-4 rounded-full border-2 border-black/25 border-t-black" />
                {status || 'Working'}
              </>
            ) : (
              <>
                <SparkIcon className="h-4 w-4" />
                Direct and play
              </>
            )}
          </button>
          {(Object.keys(DECKS) as DeckKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className="btn-ghost !py-3"
              disabled={busy}
              onClick={() => onDemo(key)}
            >
              {DECKS[key].label}
            </button>
          ))}
          {!settings.apiKey.trim() && (
            <span className="text-[12px] text-white/35">
              Add an OpenRouter key to direct your own. The finished take is bundled — no key needed.
            </span>
          )}
          {!markdown.trim() && settings.apiKey.trim() && (
            <span className="text-[12px] text-white/35">Paste some markdown, or load the sample.</span>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-accent3/40 bg-accent3/[0.07] px-4 py-3 text-sm text-accent3">
            {error}
          </div>
        )}

        {warnings.length > 0 && (
          <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <summary className="cursor-pointer text-[12px] font-semibold text-white/45">
              {warnings.length} thing{warnings.length === 1 ? '' : 's'} the director got wrong and we
              fixed
            </summary>
            <ul className="mt-2 flex flex-col gap-1">
              {warnings.map((w, i) => (
                <li key={i} className="text-[12px] text-white/35">
                  {w}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <footer className="pb-2 text-[11px] text-white/22">
        Speech runs locally via Kokoro-82M. Only the parsed text of your document is sent to
        OpenRouter, and only when you press the button.
      </footer>
    </div>
  )
}

function summarise(blocks: Block[]): { label: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const b of blocks) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1)
  const order: [string, string][] = [
    ['table', 'tables'],
    ['code', 'code blocks'],
    ['list', 'lists'],
    ['heading', 'headings'],
  ]
  return order
    .filter(([k]) => counts.get(k))
    .map(([k, label]) => ({ label, count: counts.get(k)! }))
}
