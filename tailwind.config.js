/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fff4',
          100: '#dcffe9',
          200: '#bdffd6',
          300: '#8affb8',
          400: '#00f075', // Busha-style bright green
          500: '#16e5a2', // Main Busha Green
          600: '#00b356',
          700: '#009447',
          800: '#007538',
          900: '#005729',
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
