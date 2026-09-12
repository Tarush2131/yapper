// Every whole-percent opacity, so `/12` and `/92` work the same as `/10` and `/90`.
const opacity = Object.fromEntries(
  Array.from({ length: 101 }, (_, i) => [String(i), String(i / 100)]),
)

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      opacity,
      colors: {
        ink: '#000000',
        surface: '#0b0b0d',
        edge: '#1c1c22',
        accent: '#ffe14d',
        accent2: '#4dd2ff',
        accent3: '#ff5d8f',
        muted: '#8a8a96',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'Impact', 'Haettenschweiler', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
