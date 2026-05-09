/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        base: '#0F0F1A',
        surface: '#16162A',
        elevated: '#1E1E38',
        accent: '#6C63FF',
        'accent-hover': '#7B73FF',
        success: '#22D3A5',
        warning: '#F59E0B',
        danger: '#EF4444',
        'text-primary': '#F1F0FF',
        'text-secondary': '#9B99C4',
      },
      boxShadow: {
        glow: '0 0 18px rgba(108,99,255,0.35)',
        'glow-sm': '0 0 10px rgba(108,99,255,0.2)',
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
        accent: 'rgba(108,99,255,0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        blob: 'blob 8s infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        blob: {
          '0%': { transform: 'translate(0px,0px) scale(1)' },
          '33%': { transform: 'translate(30px,-50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.9)' },
          '100%': { transform: 'translate(0px,0px) scale(1)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
