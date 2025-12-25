/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Subject colors
        subject: {
          math: '#3b82f6',      // Blue
          english: '#8b5cf6',   // Purple
          science: '#10b981',   // Green
          hsie: '#f59e0b',      // Amber
          pdhpe: '#ef4444',     // Red
          tas: '#6366f1',       // Indigo
          arts: '#ec4899',      // Pink
          languages: '#14b8a6', // Teal
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
