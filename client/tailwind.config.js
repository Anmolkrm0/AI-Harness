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
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        flow: {
          50: '#f5f3ff',
          100: '#ede9fe',
          500: '#6366f1',
          600: '#5b50e6',
          700: '#4f46e5',
          800: '#4338ca',
        },
      },
    },
  },
  plugins: [],
}
