/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './views/**/*.ejs',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        reggae: {
          green: '#10b981',
          gold: '#f59e0b',
          red: '#ef4444'
        }
      }
    }
  },
  plugins: []
};

