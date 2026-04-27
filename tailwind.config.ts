import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a", // Глубокий черный
        surface: "#141414",    // Чуть светлее для карточек
        gold: {
          DEFAULT: "#d4af37",  // Классическое золото
          light: "#f3e5ab",
          dark: "#aa8022",
        },
        textMain: "#e0e0e0",   // Светло-серый для читаемости
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Merriweather', 'serif'], // Для заголовков
      },
    },
  },
  plugins: [],
};
export default config;
