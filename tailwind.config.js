/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: {
          void: '#05060f',
          deep: '#0a0b1a',
          mid: '#12132a',
          surface: '#1a1b3a',
          edge: '#252650',
          glow: '#3d3e80',
          mist: '#8b8cc4',
          text: '#c4c5e8',
          dim: '#6b6c9a',
          gold: '#d4a843',
          lotus: '#c44d8b',
          water: '#4d8bc4',
          dawn: '#8b5cf6',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        mono: ['SF Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'ripple': 'ripple 3s ease-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 12s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-slow': 'fadeIn 1.5s ease-out',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'drift': 'drift 20s linear infinite',
        'breathe': 'breathe 8s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '50%': { transform: 'translateY(-20px) translateX(10px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.3', filter: 'blur(40px)' },
          '50%': { opacity: '0.6', filter: 'blur(60px)' },
        },
        drift: {
          '0%': { transform: 'translateX(0) rotate(0deg)' },
          '100%': { transform: 'translateX(100px) rotate(360deg)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.05)', opacity: '0.8' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      }
    },
  },
  plugins: [],
}
