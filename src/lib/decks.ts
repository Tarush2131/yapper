/** Takes that ship with the app, playable without an API key. */
import { DEMO_RESPONSE } from './demoPlan'
import { GOLDEN_GOOSE_MARKDOWN, GOLDEN_GOOSE_RESPONSE } from './goldenGoose'
import { SAMPLE_MARKDOWN } from './sample'

export const DECKS = {
  demo: {
    label: 'Watch a finished take',
    markdown: SAMPLE_MARKDOWN,
    response: DEMO_RESPONSE,
  },
  goldenGoose: {
    label: 'Golden Goose pitch',
    markdown: GOLDEN_GOOSE_MARKDOWN,
    response: GOLDEN_GOOSE_RESPONSE,
  },
} as const

export type DeckKey = keyof typeof DECKS
