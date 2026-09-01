/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
          950: '#041826',
        },
      },
      keyframes: {
        shine: {
          '0%': { 'background-position': '100%' },
          '100%': { 'background-position': '-100%' },
        },
        'border-beam': {
          '100%': {
            'offset-distance': '100%',
          },
        },
      },
      animation: {
        shine: 'shine 5s linear infinite',
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
      },
    },
  },
  plugins: [],
}
