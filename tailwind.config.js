/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jbu: {
          navy: "#0D2B47",
          blue: "#0D2B47",
          light: "#C7D8EA",
          dark: "#1B1B1B",
          white: "#FFFFFF",
        },
      },
    },
  },
  plugins: [],
};
