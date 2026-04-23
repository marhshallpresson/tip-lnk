/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5ebff',
          100: '#ecdbff',
          200: '#dbbbff',
          300: '#c28bff',
          400: '#a95bff',
          500: '#9f35e8', // Electric Purple
          600: '#8a2be2',
          700: '#7b1fa2',
          800: '#6a1b9a',
          900: '#4a148c',
        },
        surface: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
          950: '#141517',
        },
        'main-bg': '#0d1117',
        accent: {
          neon: '#00d265',
          green: '#34d399',
          red: '#f87171',
          orange: '#fb923c',
          purple: '#a78bfa',
          cyan: '#22d3ee',
          yellow: '#fbbf24',
          white: '#ffffffff'
        },
        // Solflare brand orange for partner highlighting
        solflare: {
          DEFAULT: '#FF8C00',
          light: '#FFA940',
          dark: '#CC7000',
        },
        // Phantom brand purple for partner highlighting
        'phantom-purple': '#8C4EFF',
        'phantom-dark': '#5B21B6',
      },
      fontFamily: {
        sans: ['"Link Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        brand: ['"Link Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
