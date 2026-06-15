/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '2rem',
        xl: '3rem',
      },
    },
    extend: {
      colors: {
        rose: {
          50: '#FFF8F5',
          100: '#FDEDED',
          200: '#FAD5D5',
          300: '#F8B4B4',
          400: '#F28C8C',
          500: '#E86565',
          600: '#D44949',
        },
        champagne: {
          50: '#FDFBF5',
          100: '#F5EED9',
          200: '#EBDEB4',
          300: '#D4AF37',
          400: '#B8941F',
        },
        mint: {
          100: '#E3F3E9',
          200: '#C4E7D1',
          300: '#A8D8B9',
          400: '#7EC49A',
        },
        sand: {
          50: '#FAFAF7',
          100: '#F3F0EA',
          200: '#E8E2D5',
        },
        ink: {
          900: '#2C2C2C',
          800: '#3A3A3A',
          700: '#4A4A4A',
          600: '#5C5C5C',
          500: '#7A7A7A',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(248, 180, 180, 0.15)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.06)',
        'hover': '0 8px 30px rgba(248, 180, 180, 0.25)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
