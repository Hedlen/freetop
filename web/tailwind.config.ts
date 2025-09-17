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
        body: "#f0f8ff",
        button: "#1a1a2e",
        "button-hover": "#16213e",
      },
      backgroundImage: {
        "nature-gradient": "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
        "sky-gradient": "linear-gradient(to bottom, #87CEEB 0%, #98D8E8 25%, #B0E0E6 50%, #E0F6FF 75%, #F0F8FF 100%)",
        "mountain-overlay": "linear-gradient(to bottom, rgba(135, 206, 235, 0.8) 0%, rgba(176, 224, 230, 0.6) 50%, rgba(240, 248, 255, 0.4) 100%)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
      },
    },
  },
  plugins: [
    function({ addUtilities }: { addUtilities: any }) {
      addUtilities({
        '.scrollbar-hide': {
          /* IE and Edge */
          '-ms-overflow-style': 'none',
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
} satisfies Config;
