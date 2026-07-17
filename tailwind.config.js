/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        slideUp: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulse2: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.4' } },
      },
      animation: {
        'slide-up': 'slideUp 0.2s ease-out', 'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out', 'pulse2': 'pulse2 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
