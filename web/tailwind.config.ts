import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export const PAGE_WIDTH = 960;

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      width: {
        page: `${PAGE_WIDTH}px`,
      },
      minWidth: {
        page: `${PAGE_WIDTH}px`,
      },
      maxWidth: {
        page: `${PAGE_WIDTH}px`,
      },
      colors: {
        primary: "#1D4ED8",
      },
      textColor: {
        button: "#6b7280",
        "button-hover": "#6b7280",
      },
      backgroundColor: {
        body: "#f8f7f5",
        button: "#f9f8f6",
        "button-hover": "#f3f4f6",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
    },
  },
  plugins: [],
} satisfies Config;
