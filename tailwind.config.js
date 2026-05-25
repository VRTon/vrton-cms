/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'vrton-red': 'rgb(211, 55, 65)',
        'vrton-red-dark': 'rgb(180, 35, 45)',
        'vrton-white': 'rgb(255, 255, 255)',
        'vrton-black': 'rgb(0, 0, 0)',
        'vrton-gray': 'rgb(128, 128, 128)',
        'vrton-light-gray': 'rgb(240, 240, 240)',
      },
      fontFamily: {
        'sans': ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'title-glow': 'titleGlow 3s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        titleGlow: {
          '0%': { textShadow: '0 0 20px rgb(211, 55, 65), 0 0 40px rgb(211, 55, 65)' },
          '100%': { textShadow: '0 0 30px rgb(211, 55, 65), 0 0 60px rgb(211, 55, 65), 0 0 80px rgb(211, 55, 65)' },
        },
      },
    },
  },
  plugins: [],
};