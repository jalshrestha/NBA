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
        blue: {
          400: '#4299e1',
          500: '#3182ce',
          600: '#2b6cb0',
        },
        purple: {
          400: '#9f7aea',
          500: '#805ad5',
          600: '#6b46c1',
        },
      },
      fontFamily: {
        futuristic: ['Orbitron', 'BlenderPro', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'neon-blue': '0 0 5px #00f3ff, 0 0 10px #00f3ff, 0 0 15px #00f3ff',
        'neon-purple': '0 0 5px #7c4dff, 0 0 10px #7c4dff, 0 0 15px #7c4dff',
        'neon-pink': '0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 15px #ff00ff',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(to bottom right, #111827, #0d253f)',
        'gradient-light': 'linear-gradient(to bottom right, #e0e7ff, #bfdbfe)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'gradient-shift': 'gradient 15s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        gradient: {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
      },
      backgroundSize: {
        'auto': 'auto',
        'cover': 'cover',
        'contain': 'contain',
        '200%': '200%',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} 