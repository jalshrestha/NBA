/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00f3ff',
        'neon-purple': '#7c4dff',
        'neon-pink': '#ff00ff',
        'dark-bg': '#0a0a1e',
        'light-bg': '#f0f4ff',
      },
      fontFamily: {
        futuristic: ['Orbitron', 'BlenderPro', 'sans-serif'],
      },
      boxShadow: {
        'neon-blue': '0 0 5px #00f3ff, 0 0 10px #00f3ff, 0 0 15px #00f3ff',
        'neon-purple': '0 0 5px #7c4dff, 0 0 10px #7c4dff, 0 0 15px #7c4dff',
        'neon-pink': '0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 15px #ff00ff',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(to bottom right, #111827, #0d253f)',
        'gradient-light': 'linear-gradient(to bottom right, #e0e7ff, #bfdbfe)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
} 