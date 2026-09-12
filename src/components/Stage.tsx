import { useEffect, useMemo, useRef, useState } from 'react'
import type { PlaybackState, TimedPlan } from '../types'
import { sectionAt, visualAt, type ActiveSection } from '../lib/planner'
import { Captions } from './Captions'
import { Controls, RATE_MAX, RATE_MIN, RATE_STEP } from './Controls'
import { ScriptPanel } from './ScriptPanel'
import { VisualLayer } from './visuals/VisualLayer'
import { BackIcon, WaveIcon } from './Icons'
import type { LoadProgress } from '../tts/narrator'

interface Props {
  plan: TimedPlan
  state: PlaybackState
  load: LoadProgress | null
  device: string
  backend: string
  rate: number
  onToggle(): void
  onSeek(index: number): void
  onRestart(): void
  onRate(rate: number): void
  onExit(): void
}

export function Stage({
  plan,
  state,
  load,
  device,
  backend,
  rate,
  onToggle,
  onSeek,
  onRestart,
  onRate,
  onExit,
}: Props) {
  const [scriptOpen, setScriptOpen] = useState(false)

  const segment = plan.segments[state.segmentIndex] ?? null
  const visual = useMemo(
    () => visualAt(plan.segments, state.segmentIndex),
    [plan.segments, state.segmentIndex],
  )
  const section = useMemo(
    () => sectionAt(plan.segments, state.segmentIndex),
    [plan.segments, state.segmentIndex],
  )

  const rateRef = useRef(rate)
  rateRef.current = rate

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          onToggle()
          break
        case 'ArrowRight':
          onSeek(state.segmentIndex + 1)
          break
        case 'ArrowLeft':
          onSeek(state.segmentIndex - 1)
          break
        case '[':
          onRate(Math.max(RATE_MIN, Number((rateRef.current - RATE_STEP).toFixed(2))))
          break
        case ']':
          onRate(Math.min(RATE_MAX, Number((rateRef.current + RATE_STEP).toFixed(2))))
          break
        case 's':
        case 'S':
          setScriptOpen((v) => !v)
          break
        case 'Escape':
          onExit()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onToggle, onSeek, onExit, onRate, state.segmentIndex])

  const loading = state.status === 'loading-model'

  return (
    <div className="fixed inset-0 flex flex-col lg:flex-row">
      <div className="stage-vignette relative flex min-h-0 flex-1 flex-col bg-black">
        <header className="flex shrink-0 items-center gap-3 px-4 pt-4 sm:px-8">
          <button type="button" className="btn-icon h-9 w-9" onClick={onExit} aria-label="Back to editor">
            <BackIcon className="h-4 w-4" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-[13px] font-bold text-white/70">
            {plan.title}
          </h1>
          <span className="chip hidden sm:inline-flex">
            <WaveIcon className="h-3 w-3" />
            {backend === 'kokoro' ? `Kokoro-82M · ${device}` : 'system voice'}
          </span>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center gap-6 px-4 py-4 sm:px-8">
          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
            <VisualLayer visual={visual} />
          </div>
          {section && <SectionPanel section={section} />}
        </main>

        <Captions segment={segment} progress={state.segmentProgress} />

        <Controls
          plan={plan}
          state={state}
          scriptOpen={scriptOpen}
          rate={rate}
          onToggle={onToggle}
          onSeek={onSeek}
          onRestart={onRestart}
          onRate={onRate}
          onToggleScript={() => setScriptOpen((v) => !v)}
        />

        {loading && <LoadOverlay load={load} />}

        {state.status === 'error' && state.error && (
          <div className="absolute inset-x-4 bottom-28 mx-auto max-w-lg rounded-xl border border-accent3/40 bg-accent3/10 px-4 py-3 text-sm text-accent3">
            {state.error}
          </div>
        )}
      </div>

      {scriptOpen && (
        <ScriptPanel
          plan={plan}
          activeIndex={state.segmentIndex}
          onSeek={onSeek}
          onClose={() => setScriptOpen(false)}
        />
      )}
    </div>
  )
}

/**
 * The quiet layer: what this stretch of the talk is covering, held on screen
 * while the diagram changes underneath it. Deliberately low contrast — it is a
 * speaker's running order, not a second set of captions competing for the eye.
 */
function SectionPanel({ section }: { section: ActiveSection }) {
  return (
    <aside className="hidden w-[248px] shrink-0 self-center lg:block xl:w-[280px]">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30">
        {section.title}
      </p>
      <ul className="mt-3 space-y-2.5">
        {section.points.map((p, i) => {
          const done = i < section.active
          const live = i === section.active
          return (
            <li key={p} className="flex gap-2.5">
              <span
                aria-hidden="true"
                className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full transition-colors duration-500"
                style={{ background: live ? '#ffe14d' : done ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)' }}
              />
              <span
                className="text-[13px] leading-snug transition-colors duration-500"
                style={{ color: live ? 'rgba(255,255,255,0.88)' : done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.22)' }}
              >
                {p}
              </span>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function LoadOverlay({ load }: { load: LoadProgress | null }) {
  const pct = Math.round((load?.pct ?? 0) * 100)
  const mb = (n: number) => `${(n / 1_048_576).toFixed(1)} MB`
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-black/92 px-8">
      <div className="anim-spin h-9 w-9 rounded-full border-[3px] border-white/12 border-t-accent" />
      <div className="text-center">
        <p className="text-base font-bold">Loading the voice model</p>
        <p className="mt-1.5 max-w-sm text-sm text-white/45">
          Kokoro-82M downloads once, about 86 MB, then runs entirely on this device.
        </p>
      </div>
      <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-200"
          style={{ width: `${Math.max(3, pct)}%` }}
        />
      </div>
      {load?.total ? (
        <p className="font-mono text-[11px] text-white/30">
          {mb(load.loaded)} / {mb(load.total)}
        </p>
      ) : (
        <p className="font-mono text-[11px] text-white/30">{load?.file || 'starting up'}</p>
      )}
    </div>
  )
}
