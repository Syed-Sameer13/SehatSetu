/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        palette: {
          950: '#151F28',
          900: '#1C2833', // Deep Dark Navy Slate (#1C2833)
          800: '#243444',
          700: '#2E4053', // Primary Slate Navy (#2E4053)
          600: '#4D6275',
          500: '#6C8395',
          400: '#8DA3B1',
          300: '#AAB7B8', // Muted Sage Slate (#AAB7B8)
          200: '#C2CDCE',
          100: '#D5DBDB', // Light Grey Slate Border (#D5DBDB)
          50: '#F4F6F6',  // Background Canvas Off-White (#F4F6F6)
        },
        brand: {
          50: '#F4F6F6',
          100: '#EAEFEF',
          200: '#D5DBDB',
          300: '#AAB7B8',
          400: '#8DA3B1',
          500: '#4D6275',
          600: '#2E4053',
          700: '#243444',
          800: '#1C2833',
          900: '#151F28',
          950: '#0E151B',
        },
        teal: {
          50: '#F4F6F6',
          100: '#EAEFEF',
          200: '#D5DBDB',
          300: '#AAB7B8',
          400: '#6C8395',
          500: '#4D6275',
          600: '#2E4053',
          700: '#243444',
          800: '#1C2833',
          900: '#151F28',
          950: '#0E151B',
        },
        slate: {
          50: '#F4F6F6',
          100: '#EAEFEF',
          200: '#D5DBDB',
          300: '#AAB7B8',
          400: '#8DA3B1',
          500: '#6C8395',
          600: '#4D6275',
          700: '#2E4053',
          800: '#243444',
          900: '#1C2833',
          950: '#151F28',
        },
        urgency: {
          critical: '#DC2626',
          high: '#E67E22',
          moderate: '#F39C12',
          low: '#27AE60',
          review: '#8E44AD',
        }
      },
    },
  },
  plugins: [],
}
