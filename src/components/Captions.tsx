import { useMemo } from 'react'
import type { TimedSegment } from '../types'
import { activeChunkIndex } from '../lib/planner'

interface Props {
  segment: TimedSegment | null
  /** 0..1 through the current beat. */
  progress: number
}

/**
 * Reel-style captions: a handful of words at a time, the word being spoken
 * right now lifted out of the rest, and the beats the director marked for
 * emphasis held in the accent colour throughout.
 */
export function Captions({ segment, progress }: Props) {
  const index = useMemo(
    () => (segment ? activeChunkIndex(segment.chunks, progress) : -1),
    [segment, progress],
  )

  if (!segment || index < 0) {
    return <div className="min-h-[26vh]" />
  }

  const chunk = segment.chunks[index]
  const span = Math.max(0.0001, chunk.end - chunk.start)
  const local = Math.min(1, Math.max(0, (progress - chunk.start) / span))

  return (
    <div className="flex min-h-[26vh] items-center justify-center px-5 pb-2">
      <p
        key={`${segment.id}-${index}`}
        className="anim-pop max-w-[18ch] text-balance text-center font-black leading-[1.06]
                   tracking-[-0.022em] sm:max-w-[20ch]"
        style={{ fontSize: 'clamp(2rem, 6.4vw, 4.6rem)' }}
      >
        {chunk.words.map((w, i) => {
          const state = local >= w.end ? 'spoken' : local >= w.start ? 'active' : 'upcoming'
          return (
            <span key={i}>
              <span className="caption-word" data-state={state} data-emph={w.emphasized}>
                {w.text}
              </span>
              {i < chunk.words.length - 1 ? ' ' : ''}
            </span>
          )
        })}
      </p>
    </div>
  )
}
