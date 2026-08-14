/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ecology: {
          50: '#f2f9f5',
          100: '#e2f2e9',
          200: '#c5e5d3',
          300: '#98cfb2',
          400: '#64b28a',
          500: '#3f9369',
          600: '#2f7753',
          700: '#265f43',
          800: '#204c37',
          900: '#1c402f',
          950: '#0f241c',
        },
      },
    },
  },
  plugins: [],
}
