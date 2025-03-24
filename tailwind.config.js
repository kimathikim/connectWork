/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#CC7357',
        secondary: '#6B8E23',
        background: '#F5F5DC',
      },
      fontFamily: {
        sans: ['Open Sans', 'system-ui', 'sans-serif'],
        heading: ['Roboto', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}