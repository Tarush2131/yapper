import { useEffect, useMemo, useState } from 'react'
import type { PlaybackState, TimedPlan } from '../types'
import { visualAt } from '../lib/planner'
import { Captions } from './Captions'
import { Controls } from './Controls'
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
  onToggle(): void
  onSeek(index: number): void
  onRestart(): void
  onExit(): void
}

export function Stage({
  plan,
  state,
  load,
  device,
  backend,
  onToggle,
  onSeek,
  onRestart,
  onExit,
}: Props) {
  const [scriptOpen, setScriptOpen] = useState(false)

  const segment = plan.segments[state.segmentIndex] ?? null
  const visual = useMemo(
    () => visualAt(plan.segments, state.segmentIndex),
    [plan.segments, state.segmentIndex],
  )

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
  }, [onToggle, onSeek, onExit, state.segmentIndex])

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

        <main className="flex min-h-0 flex-1 items-center justify-center py-4">
          <VisualLayer visual={visual} />
        </main>

        <Captions segment={segment} progress={state.segmentProgress} />

        <Controls
          plan={plan}
          state={state}
          scriptOpen={scriptOpen}
          onToggle={onToggle}
          onSeek={onSeek}
          onRestart={onRestart}
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
