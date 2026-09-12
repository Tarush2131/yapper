import { useMemo } from 'react'
import type { Visual } from '../../types'
import {
  BulletsVisual,
  CodeVisual,
  CompareVisual,
  FlowVisual,
  QuoteVisual,
  StatVisual,
  TableVisual,
  TimelineVisual,
} from './Diagrams'

/**
 * One visual holds the screen until the next one replaces it. `visualKey` is
 * derived from the content, so a re-render mid-beat does not restart the
 * entrance animation but a genuinely new diagram does.
 */
export function VisualLayer({ visual }: { visual: Visual | null }) {
  const key = useMemo(() => (visual ? JSON.stringify(visual) : 'none'), [visual])

  if (!visual) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="anim-glow h-1.5 w-1.5 rounded-full bg-white/25" />
      </div>
    )
  }

  return (
    <div key={key} className="flex h-full w-full items-center justify-center px-6">
      {render(visual)}
    </div>
  )
}

function render(v: Visual) {
  switch (v.type) {
    case 'bullets':
      return <BulletsVisual v={v} />
    case 'flow':
      return <FlowVisual v={v} />
    case 'compare':
      return <CompareVisual v={v} />
    case 'stat':
      return <StatVisual v={v} />
    case 'timeline':
      return <TimelineVisual v={v} />
    case 'quote':
      return <QuoteVisual v={v} />
    case 'table':
      return <TableVisual v={v} />
    case 'code':
      return <CodeVisual v={v} />
    default:
      return null
  }
}
