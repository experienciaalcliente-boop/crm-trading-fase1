/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0b0e14',
          2: '#111520',
          3: '#181e2e',
          4: '#1f2840',
        },
        brand: {
          DEFAULT: '#4e8fff',
          dim: 'rgba(78,143,255,0.15)',
          border: 'rgba(78,143,255,0.3)',
        },
        success: { DEFAULT: '#2dd4a0', dim: 'rgba(45,212,160,0.12)', border: 'rgba(45,212,160,0.3)' },
        danger:  { DEFAULT: '#f05c5c', dim: 'rgba(240,92,92,0.12)',  border: 'rgba(240,92,92,0.3)'  },
        warn:    { DEFAULT: '#f5a623', dim: 'rgba(245,166,35,0.12)', border: 'rgba(245,166,35,0.3)' },
        purple:  { DEFAULT: '#a78bfa', dim: 'rgba(167,139,250,0.12)' },
        line: 'rgba(255,255,255,0.07)',
        line2: 'rgba(255,255,255,0.12)',
        muted: '#6b7a99',
        sub: '#9aa3b8',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06), 0 4px 24px rgba(0,0,0,0.3)',
        glow: '0 0 20px rgba(78,143,255,0.2)',
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '24px' },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        pulse2: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      },
      animation: {
        fadeUp: 'fadeUp 0.25s ease',
        fadeIn: 'fadeIn 0.2s ease',
        pulse2: 'pulse2 2s ease infinite',
      },
    },
  },
  plugins: [],
}
