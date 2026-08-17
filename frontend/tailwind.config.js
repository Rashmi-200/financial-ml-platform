/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070b14',
          900: '#0c1222',
          850: '#11182c',
          800: '#162038',
          700: '#1f2d4d',
          600: '#2c3e66',
        },
        brand: {
          cyan: '#00f2fe',
          teal: '#4facfe',
          emerald: '#10b981',
          green: '#05d554',
          purple: '#8b5cf6',
          violet: '#7928ca',
          amber: '#f59e0b',
          rose: '#f43f5e',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(0, 242, 254, 0.2), 0 0 20px rgba(79, 172, 254, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(0, 242, 254, 0.6), 0 0 30px rgba(79, 172, 254, 0.4)' },
        }
      }
    },
  },
  plugins: [],
}
