import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PlaybackState, Plan, Settings, TimedPlan } from './types'
import { parseMarkdown } from './lib/markdown'
import { directScript } from './lib/openrouter'
import { buildTimedPlan } from './lib/planner'
import { DECKS, type DeckKey } from './lib/decks'
import { validatePlan } from './lib/validate'
import { DEFAULT_SETTINGS, loadDraft, loadSettings, saveDraft, saveSettings } from './lib/storage'
import { Player } from './tts/player'
import type { LoadProgress } from './tts/narrator'
import { Editor } from './components/Editor'
import { Stage } from './components/Stage'

const IDLE: PlaybackState = {
  status: 'idle',
  segmentIndex: 0,
  segmentProgress: 0,
  elapsed: 0,
}

export default function App() {
  const [view, setView] = useState<'editor' | 'stage'>('editor')
  const [markdown, setMarkdown] = useState(() => loadDraft())
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [plan, setPlan] = useState<Plan | null>(null)
  const [playback, setPlayback] = useState<PlaybackState>(IDLE)
  const [load, setLoad] = useState<LoadProgress | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const playerRef = useRef<Player | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  if (!playerRef.current) {
    playerRef.current = new Player({
      onState: setPlayback,
      onLoad: setLoad,
    })
  }
  const player = playerRef.current

  useEffect(() => () => player.dispose(), [player])
  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => {
    const t = window.setTimeout(() => saveDraft(markdown), 400)
    return () => window.clearTimeout(t)
  }, [markdown])

  /** One narrator for the whole take, when the setting asks for it. */
  const forcedVoice = settings.singleVoice ? settings.voice : undefined

  /** Pacing and speed are applied at build time, so changing them re-times the plan. */
  const timedPlan: TimedPlan | null = useMemo(
    () =>
      plan
        ? buildTimedPlan(plan, settings.visualEvery, settings.rate, forcedVoice)
        : null,
    [plan, settings.visualEvery, settings.rate, forcedVoice],
  )

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }))
  }, [])

  // -------------------------------------------------------------------------

  /** Shared tail of both entry points: load the voice model and roll. */
  const startTake = useCallback(
    async (fresh: Plan) => {
      const timed = buildTimedPlan(fresh, settings.visualEvery, settings.rate, forcedVoice)
      setView('stage')
      setStatus('Loading voice')
      await player.prepare(settings.backend, settings.device)
      player.load(timed, settings.rate)
      void player.play(0)
    },
    [player, settings.backend, settings.device, settings.rate, settings.visualEvery, forcedVoice],
  )

  /** Pre-baked takes, so the stage is reachable before anyone has a key. */
  const playDemo = useCallback(
    async (deck: DeckKey = 'demo') => {
      setBusy(true)
      setError('')
      try {
        const { markdown: src, response } = DECKS[deck]
        const blocks = parseMarkdown(src)
        const { plan: demo, warnings: w } = validatePlan(response, blocks, deck)
        setMarkdown(src)
        setPlan(demo)
        setWarnings(w)
        await startTake(demo)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setView('editor')
      } finally {
        setBusy(false)
        setStatus('')
      }
    },
    [startTake],
  )

  const generate = useCallback(async () => {
    const blocks = parseMarkdown(markdown)
    if (!blocks.length) {
      setError('That markdown did not parse into anything speakable.')
      return
    }

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setBusy(true)
    setError('')
    setWarnings([])
    setStatus('Directing')

    try {
      const { plan: fresh, warnings: w } = await directScript(
        blocks,
        settings,
        (p) =>
          setStatus(
            p.batches > 1 ? `Directing ${p.batch}/${p.batches}` : 'Directing',
          ),
        ctrl.signal,
      )
      setPlan(fresh)
      setWarnings(w)
      await startTake(fresh)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setView('editor')
    } finally {
      setBusy(false)
      setStatus('')
    }
  }, [markdown, settings, startTake])

  /**
   * Re-time a running take when the pacing sliders move.
   *
   * Guarded on the pacing values themselves rather than on `timedPlan`: a fresh
   * plan already gets loaded by `startTake`, and reloading it here would reset
   * the player's status out from under the model-loading overlay.
   */
  const pacing = useRef({ visualEvery: settings.visualEvery, rate: settings.rate })
  useEffect(() => {
    const prev = pacing.current
    if (prev.visualEvery === settings.visualEvery && prev.rate === settings.rate) return
    pacing.current = { visualEvery: settings.visualEvery, rate: settings.rate }
    if (view !== 'stage' || !timedPlan) return
    const at = player.currentIndex
    const rolling = player.status === 'playing' || player.status === 'buffering'
    player.load(timedPlan, settings.rate)
    if (rolling) void player.play(at)
    else void player.seek(at)
  }, [settings.visualEvery, settings.rate, view, timedPlan, player])

  const exitStage = useCallback(() => {
    player.cancel()
    setPlayback(IDLE)
    setView('editor')
  }, [player])

  const restart = useCallback(() => {
    void player.play(0)
  }, [player])

  // -------------------------------------------------------------------------

  if (view === 'stage' && timedPlan) {
    return (
      <Stage
        plan={timedPlan}
        state={playback}
        load={load}
        device={player.backendDevice}
        backend={settings.backend}
        onToggle={() => void player.toggle()}
        onSeek={(i) => void player.seek(i)}
        onRestart={restart}
        rate={settings.rate}
        onRate={(r) => patchSettings({ rate: r })}
        onExit={exitStage}
      />
    )
  }

  return (
    <div className="min-h-full bg-black">
      <Editor
        markdown={markdown}
        settings={settings}
        busy={busy}
        status={status}
        error={error}
        warnings={warnings}
        onMarkdown={setMarkdown}
        onSettings={patchSettings}
        onGenerate={() => void generate()}
        onDemo={(deck) => void playDemo(deck)}
      />
      {plan && (
        <button
          type="button"
          onClick={() => setView('stage')}
          className="fixed bottom-6 right-6 rounded-full border border-accent/40 bg-accent/10 px-5 py-3
                     text-[13px] font-bold text-accent backdrop-blur transition-colors hover:bg-accent/20"
        >
          Back to the last take →
        </button>
      )}
    </div>
  )
}

export { DEFAULT_SETTINGS }
