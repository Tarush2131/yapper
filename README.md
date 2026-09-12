# Yapper

**Markdown in. A narrated, subtitled, diagram-driven explainer out.**

Paste a document. An LLM rewrites it the way a person would actually say it out loud —
and *scores* the delivery beat by beat. An 82M-parameter voice model performs that score
on your device. The result plays on black, in subtitles you can read from across the room,
with a new visual roughly every fifteen seconds.

No backend. No account. Bring your own OpenRouter key.

```bash
npm install && npm run dev
```

---

## The three ideas

### 1. Tables get explained, not read

Read a markdown table aloud verbatim and you get: *"Temperature, usable capacity, charge rate,
permanent damage. Twenty-five degrees C, one hundred percent, one point zero C, none."*
Nobody listens to that.

So Yapper parses tables out of the markdown as structured data and hands them to the director
model under a hard rule: **say what the table is for and what its shape is, then give the reader
the takeaway — the outlier, the trend, the cell that matters. Never walk the grid.** What you
get instead is *"this table lines up four temperatures against three things you care about…
but the column that actually matters is the last one."*

And while a table is being explained, **no abstract diagram is allowed on screen**. The real
table renders, cell for cell, with the row or column under discussion lit up. Same rule for
code blocks. This is enforced twice — in the prompt, and again in `validatePlan`, which
silently discards an abstract visual attached to a table or code beat.

Table and code visuals are also **hydrated from your parsed source, never from the model's
output** — so no cell on screen can drift from what you actually wrote.

### 2. The LLM directs the performance, not just the words

Most TTS pipelines hand a model a wall of text and hope. Here the model returns a shooting
script where every beat carries its own direction:

```json
{
  "text": "And that metal never comes back.",
  "sourceKind": "prose",
  "blockIndex": 5,
  "voice": "am_fenrir",
  "speed": 0.82,
  "pitchCents": -200,
  "gain": 1.2,
  "pauseAfterMs": 780,
  "emphasis": ["never"],
  "visual": { "type": "quote", "text": "That metal never comes back." }
}
```

Kokoro-82M only exposes one knob natively — `speed`. Yapper builds four real ones out of it:

| Control | Range | How it's actually done |
| --- | --- | --- |
| **Tempo** | 0.7–1.4× | Kokoro's own `speed` parameter |
| **Pitch** | ±400 cents | `detune` on the playback node, with Kokoro's `speed` divided by the same ratio so the shift doesn't also change the beat's length |
| **Level** | 0.6–1.4 | Per-beat `GainNode` into a shared compressor |
| **Pause** | 0–2000 ms | Silence padded onto the buffer, so gaps ride the audio clock and freeze correctly on pause |
| **Emphasis** | 1–3 words | A comma inserted before the word that matters — the one prosody cue Kokoro reliably obeys — with guards so it never breaks against a function word or trails off before a full stop |
| **Casting** | 28 voices | A different voice for the aside, the punchline, the warning, the verdict |

The pitch trick is the interesting one: playing a buffer at `detune = +200¢` raises pitch *and*
shortens the beat by the same ratio. Generating at `speed ÷ 2^(200/1200)` cancels the second
effect and leaves only the first. Pitch and tempo become independent on a model that never
offered pitch at all.

Open the **Script** panel during playback and you can see every one of these decisions, per beat.

### 3. A visual every fifteen seconds, or the screen goes stale

The director is asked for a new visual roughly every `visualEvery` seconds (default 15,
adjustable 8–30). It picks the diagram that matches the *shape* of the idea:

`bullets` · `flow` · `compare` · `stat` · `timeline` · `quote` · `table` · `code`

Models drift on instructions like this, so `enforceVisualCadence` is the backstop: it walks the
script accumulating estimated speech time, and if a prose stretch crosses the ceiling
(1.4× the target) with nothing on screen, it derives a visual from that beat's own words —
a `stat` if there's a real number in it, `bullets` from its clauses, otherwise a `quote`.
Table and code beats are exempt, because there the rule runs the other way.

---

## Subtitles

Three to five words at a time. The word being spoken right now is lifted out in white with a
soft glow; words the director marked for emphasis hold the accent colour throughout; everything
else sits back at 34% opacity.

Timing comes from the real rendered audio, not an estimate. Each beat is split into caption
cards weighted by how long they should take to say — trailing punctuation buys extra time,
because it does in the audio too — and each card's words get sub-weights inside that. Cards
never straddle a full stop, and a single orphaned word folds back into the card before it
unless it's a punchline at the end of a beat.

---

## Getting a key

1. Grab an OpenRouter key at [openrouter.ai/keys](https://openrouter.ai/keys) (starts with `sk-or-`).
2. Paste it into the app.

It lives in your browser's `localStorage` and is sent to `openrouter.ai` and nowhere else —
there is no server in this project to send it to. The only thing that leaves your machine is
the parsed text of your document, and only when you press the button. Speech never leaves at all.

The model is a free-text field backed by OpenRouter's live catalogue, so any chat model works.
Default is `anthropic/claude-haiku-4.5` — cheap, fast, and good at this. A longer document is
split into batches, and each batch after the first is told how the last one ended so the script
reads as one take.

**Want to see it first?** Hit **Watch a finished take** — a pre-baked script ships with the app
and needs no key at all. It runs through the exact same validation path as a live response.

---

## Speech engines

| | Kokoro-82M | System voice |
| --- | --- | --- |
| Size | 82M params, ~86 MB once, then cached | already installed |
| Where it runs | your device, WebGPU or WASM | your device |
| Prosody | tempo, pitch in cents, gain, pauses, 28 voices | rate, coarse pitch, volume |
| First play | waits on the download | instant |

Kokoro is the default and the one the whole design is built around. The Web Speech fallback
exists so the app is usable during that first download and on machines without WASM SIMD;
delivery there is noticeably flatter, and that's the platform's ceiling, not a bug.

WebGPU is used when available and falls back to 8-bit quantised WASM otherwise. The dev server
sets `COOP`/`COEP` so the WASM backend can go multi-threaded; static hosts that can't set those
headers just run single-threaded, which is slower but fine.

---

## Keyboard

| Key | |
| --- | --- |
| `Space` | play / pause |
| `←` `→` | previous / next beat |
| `S` | script panel |
| `Esc` | back to the editor |

Every tick in the progress bar is one beat and is clickable. The small diamonds mark where the
visual changes.

---

## Layout

```
src/
  lib/
    markdown.ts    marked lexer -> ordered Block[]; tables and code stay structured
    openrouter.ts  batching, the chat call, response_format fallback
    validate.ts    coerce + clamp the model's output; hydrate literal visuals; repair truncated JSON
    planner.ts     caption chunking, duration weighting, visual-cadence backstop, prosody shaping
    voices.ts      28 Kokoro voices with the casting notes the director reads
    demoPlan.ts    the bundled take — also the reference example of good output
  prompts/
    system.ts      the director prompt
  tts/
    worker.ts      Kokoro in a Web Worker
    kokoro.ts      Web Audio graph, pitch compensation, buffer cache, prefetch
    webspeech.ts   fallback narrator
    player.ts      walks the plan, prefetches two beats ahead
  components/
    Stage.tsx      the black canvas
    Captions.tsx   karaoke subtitles
    visuals/       the eight diagrams
```

---

## Scripts

```bash
npm run dev        # vite, with the COOP/COEP headers for threaded wasm
npm run build      # tsc -b && vite build
npm run typecheck  # types only
npm run preview    # serve dist/
```

---

## Known limits

- The director leg has only been exercised against hand-written and bundled responses; live
  output quality varies by model, which is why `validatePlan` clamps everything and reports
  what it had to fix.
- Caption timing inside a beat is proportional, not forced-aligned. It tracks well at these
  lengths but a very long beat can drift by a word.
- Kokoro is English-only.

## License

MIT
