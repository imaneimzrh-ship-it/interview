import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#09090C',
        card:    '#111218',
        border:  '#1C1D28',
        muted:   '#2A2B38',
        dim:     '#7A829A',
        soft:    '#C4C8DA',
        bright:  '#F0F2FA',
        blue:    '#4776F7',
        'blue-d':'#1A2550',
        'blue-m':'rgba(71,118,247,0.12)',
        gold:    '#E8A020',
        'gold-m':'rgba(232,160,32,0.10)',
        green:   '#1DB954',
        'green-m':'rgba(29,185,84,0.10)',
        red:     '#E84040',
        'red-m': 'rgba(232,64,64,0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in':  'fadeIn 0.25s ease',
        'slide-up': 'slideUp 0.3s ease',
        'spin-slow':'spin 1s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                          to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

export default config
