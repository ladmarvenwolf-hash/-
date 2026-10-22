/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        msDark: '#1c222a',
        msBg: '#f6f8fb',
      },
    },
  },
  plugins: [],
};
