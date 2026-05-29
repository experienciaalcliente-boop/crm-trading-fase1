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
          DEFAULT: '#f4f6fb',
          2: '#ffffff',
          3: '#f8faff',
          4: '#f0f3fa',
        },
        brand: { DEFAULT: '#4e8fff', border: '#bdd1ff' },
        success: { DEFAULT: '#22c98e' },
        danger:  { DEFAULT: '#e03a3a' },
        warn:    { DEFAULT: '#b45309' },
        purple:  { DEFAULT: '#6d28d9' },
        line:    '#e4e9f2',
        line2:   '#dce3f0',
        muted:   '#8896b4',
        sub:     '#4a5578',
      },
      borderRadius: { xl: '10px', '2xl': '12px' },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        fadeUp: 'fadeUp 0.2s ease',
        fadeIn: 'fadeIn 0.2s ease',
      },
    },
  },
  plugins: [],
}
