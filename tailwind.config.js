/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        prism: { 50: "#f5f2ff", 500: "#8061e6", 600: "#7152d8" },
      },
    },
  },
  plugins: [],
};
