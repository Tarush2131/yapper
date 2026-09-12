import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Kokoro runs through onnxruntime-web, which ships its own wasm/worker assets.
// `exclude` keeps Vite's dep optimizer from mangling them.
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['kokoro-js', '@huggingface/transformers', 'onnxruntime-web'],
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    headers: {
      // Required for the WASM backend to use SharedArrayBuffer (multi-threaded).
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
})
