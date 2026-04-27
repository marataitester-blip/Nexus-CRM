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
        background: "#050505", // Глубокий черный фон
        surface: "#111111",    // Чуть светлее для карточек/таблиц
        gold: {
          DEFAULT: "#B89947",  // Матовое золото
          light: "#D4B86A",
          dark: "#8F7635",
        },
        silver: {
          DEFAULT: "#C0C0C0",  // Классическое серебро
          light: "#E5E4E2",    // Светлое серебро для читаемости
          dark: "#808080",
        },
        textMain: "#E5E4E2",   // Основной текст будет серебристым
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
