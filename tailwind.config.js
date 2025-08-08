import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      defaultTheme: "neutral",
      themes: {
        neutral: {
          colors: {
            primary: {
              DEFAULT: "#5fbd40ff",
            },
            background: "#8e7878ff",
          },
        },
        dark: { // member
          colors: {
            primary: {
              DEFAULT: "#2AFC98",
            },
            background: "#111111",
          },
        },
        light: { // partner
          colors: {
            primary: {
              DEFAULT: "#119DA4",
            },
            background: "#eeeeee",
          },
        },     
      },
    }),
  ],
};

module.exports = config;