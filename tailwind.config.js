/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',   // ← enables .dark class strategy
  theme: {
    extend: {
      colors: {
        white: '#FAFAFA', // Soft off-white
        black: '#090A0B', // Rich soft black
        theme: {
          bg: 'rgb(var(--theme-bg) / <alpha-value>)',
          card: 'rgb(var(--theme-card) / <alpha-value>)',
          text: 'rgb(var(--theme-text) / <alpha-value>)',
          muted: 'rgb(var(--theme-text-muted) / <alpha-value>)',
          border: 'rgb(var(--theme-border) / <alpha-value>)',
          primary: 'rgb(var(--theme-primary) / <alpha-value>)',
          'primary-hover': 'rgb(var(--theme-primary-hover) / <alpha-value>)',
          'primary-text': 'rgb(var(--theme-primary-text) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        heading: ['"Instrument Serif"', 'serif'],
        body: ['"Barlow"', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
