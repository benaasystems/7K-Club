/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          200: '#FFEFA8',
          300: '#FFE27A',
          400: '#FFD43B',
          500: '#F5C211',
          600: '#D9A800',
          700: '#A87F00',
        },
        ink: {
          950: '#060608',
          900: '#0c0c10',
          800: '#141419',
          700: '#1d1d24',
          600: '#2a2a33',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Cairo', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Outfit', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'fade-up': 'fadeUp .5s ease both',
      },
    },
  },
  plugins: [],
};
