import { useEffect, useRef } from 'react'
import type { TimedPlan } from '../types'
import { voiceLabel } from '../lib/voices'
import { CloseIcon } from './Icons'

interface Props {
  plan: TimedPlan
  activeIndex: number
  onSeek(index: number): void
  onClose(): void
}

const fmtPitch = (cents: number) =>
  cents === 0 ? '0' : `${cents > 0 ? '+' : ''}${cents}¢`

/**
 * The direction, made visible. Every beat shows the voice it was cast to and
 * the tempo, pitch and level the model asked for — which is the only way to
 * tell whether a flat-sounding run is the model's fault or the TTS's.
 */
export function ScriptPanel({ plan, activeIndex, onSeek, onClose }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-beat="${activeIndex}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex])

  return (
    <aside
      className="anim-slide flex h-full w-full flex-col border-l border-white/[0.08] bg-[#06060a]
                 lg:w-[380px]"
    >
      <header className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
        <div>
          <h2 className="text-sm font-bold">Script</h2>
          <p className="text-[11px] text-white/35">
            {plan.segments.length} beats · {plan.segments.filter((s) => s.visual).length} visuals
          </p>
        </div>
        <button type="button" className="btn-icon h-9 w-9" onClick={onClose} aria-label="Close script">
          <CloseIcon className="h-4 w-4" />
        </button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3">
        {plan.segments.map((seg, i) => {
          const active = i === activeIndex
          return (
            <button
              key={seg.id}
              type="button"
              data-beat={i}
              onClick={() => onSeek(i)}
              className="mb-1.5 block w-full rounded-xl border px-3.5 py-3 text-left transition-colors"
              style={{
                borderColor: active ? 'rgba(255,225,77,0.35)' : 'rgba(255,255,255,0.07)',
                background: active ? 'rgba(255,225,77,0.07)' : 'transparent',
              }}
            >
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] text-white/25">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="chip !py-0.5 !text-[10px]">{voiceLabel(seg.voice)}</span>
                <span className="chip !py-0.5 !text-[10px]">{seg.speed.toFixed(2)}×</span>
                <span className="chip !py-0.5 !text-[10px]">{fmtPitch(seg.pitchCents)}</span>
                {seg.gain !== 1 && (
                  <span className="chip !py-0.5 !text-[10px]">g{seg.gain.toFixed(2)}</span>
                )}
                {seg.pauseAfterMs >= 400 && (
                  <span className="chip !py-0.5 !text-[10px]">⏸ {seg.pauseAfterMs}ms</span>
                )}
                {seg.visual && (
                  <span className="chip !border-accent2/30 !py-0.5 !text-[10px] !text-accent2">
                    {seg.visual.type}
                  </span>
                )}
                {(seg.sourceKind === 'table' || seg.sourceKind === 'code') && (
                  <span className="chip !border-accent3/30 !py-0.5 !text-[10px] !text-accent3">
                    {seg.sourceKind}
                  </span>
                )}
              </div>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)' }}
              >
                {seg.text}
              </p>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
