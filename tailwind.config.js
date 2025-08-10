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
      themes: {
        memberDark: {
          extend: "dark",
          colors: {
            primary: {
              DEFAULT: "#2AFC98",
            },
          },
        },
        memberLight: {
          extend: "light",
          colors: {
            primary: {
              DEFAULT: "#2AFC98",
            },
          },
        },
        partnerDark: {
          extend: "dark",
          colors: {
            primary: {
              DEFAULT: "#119DA4",
            },
          },
        },
        partnerLight: {
          extend: "light",
          colors: {
            primary: {
              DEFAULT: "#119DA4",
            },
          },
        }     
      },
    }),
  ],
};

module.exports = config;