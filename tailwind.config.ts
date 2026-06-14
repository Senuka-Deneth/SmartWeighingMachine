import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        border: "var(--border)",
        surface: "var(--surface)",
        palette: {
          primary: "var(--palette-primary)",
          "primary-hover": "var(--palette-primary-hover)",
          "primary-light": "var(--palette-primary-light)",
          success: "var(--palette-success)",
          "success-light": "var(--palette-success-light)",
          warning: "var(--palette-warning)",
          "warning-light": "var(--palette-warning-light)",
          accent: "var(--palette-accent)",
          "accent-light": "var(--palette-accent-light)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;
