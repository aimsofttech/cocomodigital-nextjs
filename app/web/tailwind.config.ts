import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/views/**/*.{ts,tsx,mdx}",
    "./src/pages/**/*.{ts,tsx,mdx}",
    "./src/components/**/*.{ts,tsx,mdx}",
    "./src/app/**/*.{ts,tsx,mdx}",
    "./src/**/*.{ts,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "var(--section-pad-x, 1rem)",
        sm: "var(--section-pad-x, 1rem)",
        md: "var(--section-pad-x, 2rem)",
        lg: "var(--section-pad-x, 3rem)",
        xl: "var(--section-pad-x, 4rem)",
      },
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        brand: "var(--brand, var(--color-primary, #fff000))",
        "brand-dark": "var(--brand-dark, var(--yellow-dark, #e6d800))",
        "brand-on": "var(--brand-on, #000000)",
        page: "var(--bg-page, #ffffff)",
        "page-soft": "var(--bg-page-soft, #f7f7f7)",
        "page-tint": "var(--bg-page-tint, #ececec)",
        "dark-surface": "var(--bg-dark, #000000)",
        "dark-elevated": "var(--bg-dark-elevated, #0a0a0a)",
        strong: "var(--text-strong, #111111)",
        body: "var(--text-body, #1f1f1f)",
        muted: "var(--text-muted, rgba(17, 17, 17, 0.6))",
        subtle: "var(--text-subtle, rgba(17, 17, 17, 0.45))",
      },
      fontFamily: {
        sans: ['"Satoshi"', '"Stoshi"', "Arial", "sans-serif"],
        primary: ['"Satoshi"', "Arial", "sans-serif"],
        satoshi: ['"Satoshi"', '"Stoshi"', "Arial", "sans-serif"],
        stoshi: ['"Stoshi"', "Arial", "sans-serif"],
        helvetica: ['"Helvetica"', "Arial", "sans-serif"],
        gravity: ['"ABC Gravity"', "Arial", "sans-serif"],
        railroad1: ['"Railroad Gothic1"', "Arial", "sans-serif"],
        railroad2: ['"Railroad Gothic2"', "Arial", "sans-serif"],
        sofiaPro: ['"Sofia Pro"', "Arial", "sans-serif"],
        impact: ['"Impact"', "Arial", "sans-serif"],
        kamu: ['"Kamu"', "Arial", "sans-serif"],
      },
      spacing: {
        section: "var(--section-pad-y, 5rem)",
        "section-x": "var(--section-pad-x, 1rem)",
        "content-max": "var(--content-max-w, 1440px)",
      },
      borderRadius: {
        sticker: "var(--radius-md, 10px)",
        pill: "var(--radius-pill, 999px)",
      },
      boxShadow: {
        sticker: "4px 4px 0 var(--brand, var(--color-primary, #fff000))",
        "sticker-strong": "4px 4px 0 var(--text-strong, #111111)",
        glow: "var(--shadow-glow, 0 0 0 4px rgba(255, 240, 0, 0.25))",
      },
      backgroundImage: {
        "highlight-yellow":
          "linear-gradient(transparent 60%, var(--brand, var(--color-primary, #fff000)) 60%)",
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
