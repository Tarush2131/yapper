/**
 * A second pre-baked take, directed by hand rather than by the model.
 *
 * Same shape as `DEMO_RESPONSE`, same `validatePlan` path — the point is that a
 * finished deck can be authored without an API key when the director call is
 * unavailable or the material is too specific to trust to a model.
 *
 * It honours the rules the same way a live response has to: the first beat is a
 * standalone TL;DR, the table beat explains the grid instead of walking it, the
 * script carries section signposting, and a visual lands every few seconds.
 *
 * One narrator throughout. All the variation is in tempo, pitch, gain and pause —
 * which is also what the `singleVoice` setting enforces on a live take.
 */

const VOICE = 'af_kore'

/** Repeated verbatim across every beat in a chapter, so the panel holds steady. */
const SECTIONS = {
  headline: {
    section: 'The headline',
    points: ['What they actually have', 'What they cannot do yet', 'Why that is still the pitch'],
  },
  code: {
    section: 'What the code says',
    points: ['Four claims, checked against files', 'Every one resolves to a stub', 'The gap is months, not weeks'],
  },
  demo: {
    section: 'The demo already exists',
    points: ['An outside idea arrived', 'It was audited, not chased', 'The answer came back negative', 'That is the product'],
  },
  refusal: {
    section: 'The refusal',
    points: ['A gate that could not be met', 'The denominator was not narrowed', 'Why that one sentence sells'],
  },
  play: {
    section: 'What to do about it',
    points: ['Remove the checkable failure', 'Volunteer the gap first', 'Sell the pilot, not equity', 'Keep the archive'],
  },
} as const

export const GOLDEN_GOOSE_MARKDOWN = `# The pitch that survives contact

Project Golden Goose has a validation factory that is genuinely rare, and an execution stack that does not exist. The difference between those two sentences is the whole meeting.

## What was actually verified

Every claim below was checked against the repository, not taken on trust.

| Claim to the investor | What the code says |
| --- | --- |
| There is a strategy interface to plug into | \`qf/api.py\` has zero implementations |
| There is broker integration | Every method raises \`LiveTradingDisabled\` |
| It can place orders | Live submission is a hard-coded refusal |
| There is a paper-trading loop | \`bot.py\` fails at import |

## The demo already exists

Somebody brought an anecdote from Reddit about a premium on an international ETF. The programme did not dismiss it and did not chase it. It audited it.

- Verified the premium is partly a fifteen-second stale-mark artifact, by construction
- Showed a retail account cannot touch it: creation units start north of twenty-five crore
- Froze and hashed a spec for the nearest testable domestic pair before seeing any outcome
- Ran it once. Minus two point seven six percentage points, with capacity binding at one crore
- Found and fixed a split-factor defect in the price panel on the way past

## The refusal

The index-reconstitution study needed ninety percent coverage of a hundred and forty-four documents, inside a twenty-request budget. The most it could reach was thirteen percent.

> Narrowing the denominator to fit the budget was considered and rejected as a post-hoc change.

Most shops would have quietly redefined the denominator and reported a pass. This one wrote down that it refused. That sentence is worth more than every performance number in the archive.

## Before the meeting

- Spend the one hour fixing the dead import, so the most checkable failure is gone
- Print the readiness audit and volunteer the execution gap before he finds it
- Put the ETF decision document on the table as the product

## The ask

Do not sell equity into a search. Sell a paid engagement to run his strategy through the same funnel, then fund the execution stack as a tranche against a defined deliverable, and price equity later against something real.

Keep the archive in your own name throughout, because on current evidence the likeliest state in eighteen months is still zero certified edges, and the factory is the thing that must still be yours on that morning.
`

export const GOLDEN_GOOSE_RESPONSE = {
  title: 'The pitch that survives contact',
  segments: [
    // --- hook: stands alone, gives away the conclusion -----------------------
    {
      text: 'Twenty-one trials. Zero certified edges. And the honest version of that is a better pitch than the one you were going to give.',
      sourceKind: 'heading',
      blockIndex: 0,
      voice: VOICE,
      speed: 1.04,
      pitchCents: 50,
      gain: 1.2,
      pauseAfterMs: 380,
      emphasis: ['Zero', 'better pitch'],
      ...SECTIONS.headline,
      visual: {
        type: 'stat',
        value: '0',
        label: 'certified edges, across twenty-one trials',
        caption: 'this is the strong version, not the weak one',
      },
    },
    {
      text: 'There is a validation factory here that is genuinely rare. There is also an execution stack that does not exist. The gap between those two is the entire meeting.',
      sourceKind: 'paragraph',
      blockIndex: 1,
      voice: VOICE,
      speed: 1.0,
      pitchCents: 0,
      gain: 1.0,
      pauseAfterMs: 340,
      emphasis: ['does not exist'],
      ...SECTIONS.headline,
      visual: {
        type: 'compare',
        title: 'Two halves, very different states',
        left: { label: 'Research', items: ['Pre-registered gates', 'Two engines agree to 1e-9', 'Rejections preserved'] },
        right: { label: 'Execution', items: ['No broker client', 'No live data feed', 'No trading loop'] },
      },
    },

    // --- the check -----------------------------------------------------------
    {
      text: 'So start here. The line about only needing a strategy plugged in does not hold, and every part of it was checked against the code.',
      sourceKind: 'paragraph',
      blockIndex: 3,
      voice: VOICE,
      speed: 0.93,
      pitchCents: -110,
      gain: 1.1,
      pauseAfterMs: 460,
      emphasis: ['does not hold'],
      ...SECTIONS.code,
      visual: {
        type: 'stat',
        value: '4 of 4',
        label: 'claims checked against the code',
        caption: 'none of them survived',
      },
    },
    {
      text: 'This table has four rows and they all fail the same way. Each pairs something you might say out loud with what the file underneath actually does. Every promise resolves to a stub — an interface nobody implements, a broker that refuses, an order path that is a hard-coded no, and an entry point that will not even import.',
      sourceKind: 'table',
      blockIndex: 4,
      voice: VOICE,
      speed: 0.98,
      pitchCents: -20,
      gain: 1.0,
      pauseAfterMs: 540,
      emphasis: ['stub', 'will not even import'],
      ...SECTIONS.code,
      visual: { type: 'table', blockIndex: 4, title: 'Claim versus code' },
    },

    // --- the turn ------------------------------------------------------------
    {
      text: 'But here is what changed, and it is better than it sounds.',
      sourceKind: 'heading',
      blockIndex: 5,
      voice: VOICE,
      speed: 1.1,
      pitchCents: 110,
      gain: 1.15,
      pauseAfterMs: 260,
      emphasis: ['better'],
      ...SECTIONS.demo,
      visual: null,
    },
    {
      text: 'You no longer have to describe the pilot. You already ran it. Someone brought an anecdote off Reddit about a premium on an international ETF, and the programme neither dismissed it nor chased it.',
      sourceKind: 'paragraph',
      blockIndex: 6,
      voice: VOICE,
      speed: 1.02,
      pitchCents: 10,
      gain: 1.0,
      pauseAfterMs: 300,
      emphasis: ['already ran it'],
      ...SECTIONS.demo,
      visual: {
        type: 'bullets',
        title: 'The anecdote',
        items: ['A premium on an international ETF', 'Not dismissed', 'Not chased', 'Audited'],
      },
    },
    {
      text: 'It proved the premium was partly an artifact of a fifteen-second delay. It showed a retail account could never reach it, because creation units start north of twenty-five crore. It froze a hashed spec before looking at any result.',
      sourceKind: 'list',
      blockIndex: 7,
      voice: VOICE,
      speed: 1.14,
      pitchCents: 40,
      gain: 1.05,
      pauseAfterMs: 300,
      emphasis: ['before looking'],
      ...SECTIONS.demo,
      visual: {
        type: 'flow',
        title: 'What the audit actually did',
        steps: ['Verify the claim', 'Check retail can reach it', 'Freeze a hashed spec', 'Run it once', 'Report the loss'],
      },
    },
    {
      text: 'Then it ran the test once. Minus two point seven six percentage points against plain buy and hold, with capacity binding at one crore. And it found a split-factor bug in the price panel on the way past.',
      sourceKind: 'paragraph',
      blockIndex: 6,
      voice: VOICE,
      speed: 0.96,
      pitchCents: -30,
      gain: 1.18,
      pauseAfterMs: 560,
      emphasis: ['once', 'Minus two point seven six'],
      ...SECTIONS.demo,
      visual: {
        type: 'stat',
        value: '−2.76pp',
        label: 'excess return of the tested pair',
        caption: 'a clean, cheap, decisive failure',
      },
    },

    // --- the credibility artifact -------------------------------------------
    {
      text: 'Now the part nobody else will show him.',
      sourceKind: 'heading',
      blockIndex: 8,
      voice: VOICE,
      speed: 0.95,
      pitchCents: -40,
      gain: 0.84,
      pauseAfterMs: 420,
      emphasis: ['nobody else'],
      ...SECTIONS.refusal,
      visual: {
        type: 'stat',
        value: '13%',
        label: 'coverage reachable against a gate demanding 90%',
        caption: 'so the study was not run',
      },
    },
    {
      text: 'They could have quietly shrunk the denominator until the gate passed. Instead they wrote down that they considered exactly that, and refused.',
      // A blockquote is not a literal kind, so it narrates as prose.
      sourceKind: 'prose',
      blockIndex: 10,
      voice: VOICE,
      speed: 0.88,
      pitchCents: -160,
      gain: 1.15,
      pauseAfterMs: 640,
      emphasis: ['considered exactly that', 'refused'],
      ...SECTIONS.refusal,
      visual: {
        type: 'quote',
        text: 'Narrowing the denominator to fit the budget was considered and rejected as a post-hoc change.',
        attribution: 'atlas / reddit_l1_20260912 / decision.md',
      },
    },
    {
      text: 'That one sentence is worth more than every performance number in the archive. A man with ten crore has been shown plenty of good numbers. He has never been handed a document that kills an idea he liked, with arithmetic he can audit.',
      sourceKind: 'paragraph',
      blockIndex: 11,
      voice: VOICE,
      speed: 1.0,
      pitchCents: 10,
      gain: 1.05,
      pauseAfterMs: 480,
      emphasis: ['never been handed'],
      ...SECTIONS.refusal,
      visual: {
        type: 'compare',
        title: 'What he gets shown, and what you would show him',
        left: { label: 'Usually', items: ['Good numbers', 'A confident story', 'No way to check it'] },
        right: { label: 'From you', items: ['A document that kills an idea he liked', 'Arithmetic he can audit'] },
      },
    },

    // --- the play ------------------------------------------------------------
    {
      text: 'So, three things before you walk in. Fix the dead import — it takes an hour and removes your most checkable embarrassment. Print the readiness audit. And volunteer the gap yourself.',
      sourceKind: 'list',
      blockIndex: 13,
      voice: VOICE,
      speed: 1.12,
      pitchCents: 40,
      gain: 1.08,
      pauseAfterMs: 380,
      emphasis: ['volunteer the gap yourself'],
      ...SECTIONS.play,
      visual: {
        type: 'bullets',
        title: 'Before the meeting',
        items: ['Fix the dead import — one hour', 'Lead with the readiness audit', 'Bring the ETF decision as the demo'],
      },
    },
    {
      text: 'Then make the ask small. Do not sell equity into a search. Sell a paid engagement to run his strategy through the same funnel. Fund the execution stack as a tranche against a deliverable. Price equity later, against something real.',
      sourceKind: 'paragraph',
      blockIndex: 15,
      voice: VOICE,
      speed: 1.02,
      pitchCents: 20,
      gain: 1.15,
      pauseAfterMs: 520,
      emphasis: ['small'],
      ...SECTIONS.play,
      visual: {
        type: 'timeline',
        title: 'The ask, in order',
        points: [
          { when: 'Now', what: 'Paid pilot on his strategy' },
          { when: 'On delivery', what: 'Tranche for the execution stack' },
          { when: 'Later', what: 'Equity, priced against evidence' },
        ],
      },
    },
    {
      text: 'And keep the archive in your own name. On current evidence the likeliest state in eighteen months is still zero certified edges — and the factory is the thing that has to still be yours on that morning.',
      sourceKind: 'paragraph',
      blockIndex: 16,
      voice: VOICE,
      speed: 0.92,
      pitchCents: -90,
      gain: 1.1,
      pauseAfterMs: 900,
      emphasis: ['your own name', 'that morning'],
      ...SECTIONS.play,
      visual: {
        type: 'stat',
        value: '18 months',
        label: 'likeliest state: still zero certified edges',
        caption: 'own the factory on that morning',
      },
    },
  ],
}
