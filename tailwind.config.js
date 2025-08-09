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
            background: "#8e7878ff",
          },
        },
        memberLight: {
          extend: "light",
          colors: {
            primary: {
              DEFAULT: "#2AFC98",
            },
            background: "#f49393ff",
          },
        },
        partnerDark: {
          extend: "dark",
          colors: {
            primary: {
              DEFAULT: "#119DA4",
            },
            background: "#03663dff",
          },
        },
        partnerLight: {
          extend: "light",
          colors: {
            primary: {
              DEFAULT: "#119DA4",
            },
            background: "#bdd3caff",
          },
        }     
      },
    }),
  ],
};

module.exports = config;