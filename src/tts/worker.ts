/// <reference lib="webworker" />
import { KokoroTTS } from 'kokoro-js'

/**
 * Kokoro-82M lives here so model loading and inference never block the UI.
 *
 * The model is ~86 MB at q8 and is fetched once, then served from the browser
 * cache. Everything runs on-device — no audio and no text leaves the machine
 * at this stage.
 */

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX'

type InMsg =
  | { type: 'init'; device: 'auto' | 'webgpu' | 'wasm' }
  | { type: 'synth'; id: string; text: string; voice: string; speed: number }

type OutMsg =
  | { type: 'progress'; file: string; loaded: number; total: number; pct: number }
  | { type: 'ready'; device: string; voices: string[] }
  | { type: 'audio'; id: string; pcm: Float32Array; sampleRate: number }
  | { type: 'error'; id?: string; message: string }

const post = (m: OutMsg, transfer?: Transferable[]) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(m, transfer ?? [])

let tts: KokoroTTS | null = null
let loading: Promise<KokoroTTS> | null = null

async function hasWebGPU(): Promise<boolean> {
  const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu) return false
  try {
    return Boolean(await gpu.requestAdapter())
  } catch {
    return false
  }
}

function progressCallback(p: unknown) {
  const x = p as Record<string, any>
  if (x?.status !== 'progress' && x?.status !== 'download') return
  const loaded = Number(x.loaded ?? 0)
  const total = Number(x.total ?? 0)
  post({
    type: 'progress',
    file: String(x.file ?? ''),
    loaded,
    total,
    pct: total > 0 ? loaded / total : 0,
  })
}

async function load(device: 'auto' | 'webgpu' | 'wasm'): Promise<KokoroTTS> {
  if (tts) return tts
  if (loading) return loading

  loading = (async () => {
    const wantGpu = device === 'webgpu' || (device === 'auto' && (await hasWebGPU()))

    if (wantGpu) {
      try {
        const model = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: 'fp32',
          device: 'webgpu',
          progress_callback: progressCallback,
        })
        post({ type: 'ready', device: 'webgpu', voices: Object.keys(model.voices ?? {}) })
        tts = model
        return model
      } catch (err) {
        // WebGPU can fail well after adapter detection (shader compile, OOM).
        post({
          type: 'progress',
          file: 'falling back to wasm',
          loaded: 0,
          total: 0,
          pct: 0,
        })
        void err
      }
    }

    const model = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: progressCallback,
    })
    post({ type: 'ready', device: 'wasm', voices: Object.keys(model.voices ?? {}) })
    tts = model
    return model
  })()

  try {
    return await loading
  } finally {
    loading = null
  }
}

self.addEventListener('message', async (event: MessageEvent<InMsg>) => {
  const msg = event.data
  try {
    if (msg.type === 'init') {
      await load(msg.device)
      return
    }

    if (msg.type === 'synth') {
      const model = tts ?? (await load('auto'))
      const text = msg.text.trim()
      if (!text) throw new Error('Nothing to say.')

      const audio = await model.generate(text, {
        voice: msg.voice as NonNullable<Parameters<KokoroTTS['generate']>[1]>['voice'],
        speed: msg.speed,
      })

      // Copy so the buffer we transfer is not one the model still owns.
      const pcm = new Float32Array(audio.audio)
      post(
        { type: 'audio', id: msg.id, pcm, sampleRate: audio.sampling_rate },
        [pcm.buffer],
      )
    }
  } catch (err) {
    post({
      type: 'error',
      id: 'id' in msg ? (msg as { id?: string }).id : undefined,
      message: err instanceof Error ? err.message : String(err),
    })
  }
})
