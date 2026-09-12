import type { Visual } from '../../types'

/**
 * Every diagram renders on pure black with a thin edge, a single accent, and
 * type that stays legible from across a room. Children stagger in so the screen
 * builds rather than snaps.
 */

const ACCENTS = ['#ffe14d', '#4dd2ff', '#ff5d8f', '#7cf5a0'] as const

const stagger = (i: number, step = 70): React.CSSProperties => ({
  animationDelay: `${i * step}ms`,
})

// ---------------------------------------------------------------------------

export function BulletsVisual({ v }: { v: Extract<Visual, { type: 'bullets' }> }) {
  return (
    <div className="w-full max-w-3xl">
      {v.title && <div className="viz-title anim-rise">{v.title}</div>}
      <ul className="flex flex-col gap-3.5">
        {v.items.map((item, i) => (
          <li
            key={i}
            style={stagger(i, 110)}
            className="anim-slide flex items-center gap-4 rounded-2xl border border-white/[0.09]
                       bg-white/[0.025] px-6 py-5"
          >
            <span
              className="h-3.5 w-3.5 shrink-0 rotate-45 rounded-[3px]"
              style={{ background: ACCENTS[i % ACCENTS.length] }}
            />
            <span className="text-[clamp(1.15rem,2.6vw,1.85rem)] font-bold leading-snug text-white/92">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function FlowVisual({ v }: { v: Extract<Visual, { type: 'flow' }> }) {
  return (
    <div className="w-full max-w-4xl">
      {v.title && <div className="viz-title anim-rise">{v.title}</div>}
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:gap-0">
        {v.steps.map((step, i) => (
          <div key={i} className="flex flex-1 items-center gap-2 md:flex-col md:gap-0">
            <div
              style={stagger(i, 130)}
              className="anim-pop flex min-h-[74px] w-full flex-1 items-center justify-center
                         rounded-2xl border border-white/12 bg-white/[0.04] px-4 py-4 text-center"
            >
              <span className="text-[clamp(0.95rem,1.9vw,1.35rem)] font-bold leading-tight text-white/92">
                {step}
              </span>
            </div>
            {i < v.steps.length - 1 && (
              <div
                style={stagger(i, 130)}
                className="anim-pop flex shrink-0 items-center justify-center px-1 py-1
                           md:w-full md:px-0"
              >
                <Arrow accent={ACCENTS[i % ACCENTS.length]} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Arrow({ accent }: { accent: string }) {
  return (
    <>
      {/* horizontal on wide screens, vertical when the flow stacks */}
      <svg className="hidden md:block" width="100%" height="26" viewBox="0 0 80 26" fill="none">
        <path d="M4 13h62" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
        <path
          d="M62 6l10 7-10 7"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="md:hidden" width="26" height="30" viewBox="0 0 26 30" fill="none">
        <path d="M13 3v18" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
        <path
          d="M6 18l7 9 7-9"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  )
}

// ---------------------------------------------------------------------------

export function CompareVisual({ v }: { v: Extract<Visual, { type: 'compare' }> }) {
  const sides = [
    { ...v.left, accent: ACCENTS[1] },
    { ...v.right, accent: ACCENTS[2] },
  ]
  return (
    <div className="w-full max-w-4xl">
      {v.title && <div className="viz-title anim-rise">{v.title}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sides.map((side, s) => (
          <div
            key={s}
            style={stagger(s, 140)}
            className="anim-pop rounded-2xl border border-white/[0.09] bg-white/[0.025] p-6"
          >
            <div
              className="mb-4 border-b pb-3 text-[clamp(1rem,2vw,1.4rem)] font-black uppercase
                         tracking-wide"
              style={{ color: side.accent, borderColor: `${side.accent}33` }}
            >
              {side.label}
            </div>
            <ul className="flex flex-col gap-2.5">
              {side.items.map((item, i) => (
                <li
                  key={i}
                  style={stagger(s * 2 + i, 90)}
                  className="anim-slide flex gap-2.5 text-[clamp(0.92rem,1.7vw,1.2rem)] font-semibold
                             leading-snug text-white/85"
                >
                  <span style={{ color: side.accent }}>—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function StatVisual({ v }: { v: Extract<Visual, { type: 'stat' }> }) {
  return (
    <div className="anim-pop w-full max-w-3xl text-center">
      <div
        className="font-display leading-[0.86] tracking-tight text-accent"
        style={{ fontSize: 'clamp(4.5rem, 17vw, 12rem)' }}
      >
        {v.value}
      </div>
      {v.label && (
        <div
          className="anim-rise mx-auto mt-6 max-w-xl text-balance text-[clamp(1.05rem,2.3vw,1.6rem)]
                     font-bold leading-snug text-white/85"
          style={stagger(1, 160)}
        >
          {v.label}
        </div>
      )}
      {v.caption && (
        <div
          className="anim-rise mx-auto mt-3 max-w-lg text-balance text-[clamp(0.85rem,1.5vw,1.05rem)]
                     font-medium text-white/40"
          style={stagger(2, 160)}
        >
          {v.caption}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function TimelineVisual({ v }: { v: Extract<Visual, { type: 'timeline' }> }) {
  return (
    <div className="w-full max-w-4xl">
      {v.title && <div className="viz-title anim-rise">{v.title}</div>}
      <div className="relative pt-8">
        <div className="anim-draw absolute left-0 right-0 top-[46px] h-[2px] bg-white/12" />
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: `repeat(${v.points.length}, minmax(0, 1fr))` }}
        >
          {v.points.map((p, i) => (
            <div key={i} style={stagger(i, 150)} className="anim-pop flex flex-col items-center">
              <div
                className="mb-2 text-[clamp(0.85rem,1.7vw,1.15rem)] font-black tracking-wide"
                style={{ color: ACCENTS[i % ACCENTS.length] }}
              >
                {p.when}
              </div>
              <div
                className="h-3.5 w-3.5 rounded-full ring-4 ring-black"
                style={{ background: ACCENTS[i % ACCENTS.length] }}
              />
              <div
                className="mt-3.5 text-balance text-center text-[clamp(0.85rem,1.6vw,1.1rem)]
                           font-semibold leading-snug text-white/80"
              >
                {p.what}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function QuoteVisual({ v }: { v: Extract<Visual, { type: 'quote' }> }) {
  return (
    <div className="anim-rise w-full max-w-3xl">
      <div className="flex gap-5">
        <div className="anim-glow w-[5px] shrink-0 rounded-full bg-accent" />
        <div>
          <p
            className="text-balance font-black leading-[1.18] text-white/94"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}
          >
            {v.text}
          </p>
          {v.attribution && (
            <p className="mt-5 text-[clamp(0.85rem,1.5vw,1.05rem)] font-semibold uppercase tracking-[0.18em] text-white/35">
              {v.attribution}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function TableVisual({ v }: { v: Extract<Visual, { type: 'table' }> }) {
  const headers = v.headers ?? []
  const rows = v.rows ?? []
  const hlRow = v.highlight?.row
  const hlCol = v.highlight?.col

  return (
    <div className="w-full max-w-4xl">
      {v.title && <div className="viz-title anim-rise">{v.title}</div>}
      <div className="anim-pop overflow-x-auto rounded-2xl border border-white/[0.09] bg-white/[0.02]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {headers.map((h, c) => (
                <th
                  key={c}
                  className="border-b border-white/12 px-4 py-3.5 text-[clamp(0.7rem,1.25vw,0.9rem)]
                             font-black uppercase tracking-[0.1em] transition-colors duration-300"
                  style={{ color: hlCol === c ? ACCENTS[0] : 'rgba(255,255,255,0.42)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => {
              const rowLit = hlRow === r
              return (
                <tr
                  key={r}
                  style={stagger(r, 55)}
                  className="anim-slide transition-colors duration-300"
                >
                  {row.map((cell, c) => {
                    const lit = rowLit || hlCol === c
                    const both = rowLit && hlCol === c
                    return (
                      <td
                        key={c}
                        className="border-b border-white/[0.06] px-4 py-3.5 font-mono
                                   text-[clamp(0.8rem,1.5vw,1.05rem)] transition-all duration-300"
                        style={{
                          color: both ? '#000' : lit ? '#fff' : 'rgba(255,255,255,0.5)',
                          background: both
                            ? ACCENTS[0]
                            : lit
                              ? 'rgba(255,225,77,0.09)'
                              : 'transparent',
                          fontWeight: lit ? 700 : 400,
                        }}
                      >
                        {cell}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-white/22">
        Shown exactly as written — no diagram stands in for a table
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function CodeVisual({ v }: { v: Extract<Visual, { type: 'code' }> }) {
  const lines = v.lines ?? []
  const lit = new Set(v.highlight ?? [])
  return (
    <div className="w-full max-w-3xl">
      <div className="viz-title anim-rise">{v.title ?? v.lang ?? 'code'}</div>
      <div className="anim-pop overflow-x-auto rounded-2xl border border-white/[0.09] bg-black/70 py-4">
        {lines.map((line, i) => {
          const on = lit.has(i + 1)
          return (
            <div
              key={i}
              className="anim-slide flex gap-4 px-5 py-[3px] transition-colors duration-300"
              style={{
                ...stagger(i, 34),
                background: on ? 'rgba(255,225,77,0.08)' : 'transparent',
                boxShadow: on ? `inset 3px 0 0 ${ACCENTS[0]}` : 'none',
              }}
            >
              <span className="w-7 shrink-0 select-none text-right font-mono text-[clamp(0.65rem,1.1vw,0.85rem)] text-white/18">
                {i + 1}
              </span>
              <pre
                className="flex-1 whitespace-pre font-mono text-[clamp(0.72rem,1.35vw,1rem)] leading-relaxed"
                style={{
                  color: on ? '#ffe14d' : 'rgba(255,255,255,0.62)',
                  fontWeight: on ? 600 : 400,
                }}
              >
                {line || ' '}
              </pre>
            </div>
          )
        })}
      </div>
    </div>
  )
}
