import type { PlaybackState, TimedPlan } from '../types'
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, RestartIcon, ScriptIcon } from './Icons'

interface Props {
  plan: TimedPlan
  state: PlaybackState
  scriptOpen: boolean
  onToggle(): void
  onSeek(index: number): void
  onRestart(): void
  onToggleScript(): void
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function Controls({
  plan,
  state,
  scriptOpen,
  onToggle,
  onSeek,
  onRestart,
  onToggleScript,
}: Props) {
  const total = plan.estimatedDuration
  const playing = state.status === 'playing' || state.status === 'buffering'
  const ended = state.status === 'ended'

  return (
    <div className="flex flex-col gap-3 px-4 pb-5 pt-3 sm:px-8">
      {/* One tick per beat — the whole structure of the script is scrubbable. */}
      <div className="flex items-center gap-2.5">
        {/* The total is an estimate, so clamp rather than letting elapsed run past it. */}
        <span className="w-11 shrink-0 text-right font-mono text-[11px] tabular-nums text-white/35">
          {clock(Math.min(state.elapsed, total))}
        </span>
        <div className="flex h-6 flex-1 items-center gap-[2px]">
          {plan.segments.map((seg, i) => {
            const done = i < state.segmentIndex
            const active = i === state.segmentIndex
            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => onSeek(i)}
                title={`${i + 1}. ${seg.text.slice(0, 70)}`}
                aria-label={`Jump to beat ${i + 1}`}
                className="group relative h-6 flex-1 min-w-[3px]"
                style={{ flexGrow: Math.max(0.4, seg.estimatedDuration) }}
              >
                <span
                  className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden
                             rounded-full bg-white/12 transition-all duration-200
                             group-hover:h-[7px] group-hover:bg-white/25"
                >
                  <span
                    className="block h-full rounded-full bg-accent transition-[width] duration-100"
                    style={{
                      width: done ? '100%' : active ? `${state.segmentProgress * 100}%` : '0%',
                    }}
                  />
                </span>
                {seg.visual && (
                  <span
                    className="pointer-events-none absolute left-1/2 top-[3px] h-[5px] w-[5px]
                               -translate-x-1/2 rotate-45 rounded-[1px] bg-accent2/70"
                    title="visual change"
                  />
                )}
              </button>
            )
          })}
        </div>
        <span className="w-11 shrink-0 font-mono text-[11px] tabular-nums text-white/35">
          {clock(total)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          className="btn-icon"
          onClick={() => onSeek(state.segmentIndex - 1)}
          disabled={state.segmentIndex <= 0}
          aria-label="Previous beat"
        >
          <PrevIcon />
        </button>

        <button
          type="button"
          onClick={ended ? onRestart : onToggle}
          aria-label={ended ? 'Play again' : playing ? 'Pause' : 'Play'}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-black
                     transition-all duration-150 hover:brightness-110 active:scale-95"
        >
          {state.status === 'buffering' ? (
            <span className="anim-spin block h-5 w-5 rounded-full border-[2.5px] border-black/25 border-t-black" />
          ) : ended ? (
            <RestartIcon className="h-[22px] w-[22px]" />
          ) : playing ? (
            <PauseIcon className="h-[22px] w-[22px]" />
          ) : (
            <PlayIcon className="h-[22px] w-[22px] translate-x-[1px]" />
          )}
        </button>

        <button
          type="button"
          className="btn-icon"
          onClick={() => onSeek(state.segmentIndex + 1)}
          disabled={state.segmentIndex >= plan.segments.length - 1}
          aria-label="Next beat"
        >
          <NextIcon />
        </button>

        <button
          type="button"
          className="btn-icon ml-2"
          onClick={onToggleScript}
          aria-pressed={scriptOpen}
          aria-label="Toggle script"
          style={scriptOpen ? { borderColor: 'rgba(255,225,77,0.5)', color: '#ffe14d' } : undefined}
        >
          <ScriptIcon />
        </button>
      </div>
    </div>
  )
}
