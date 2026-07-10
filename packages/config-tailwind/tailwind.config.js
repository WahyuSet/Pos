/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1E3A5F", // Navy
          hover: "#162D4A",
        },
        secondary: {
          DEFAULT: "#6B7280", // Gray
          hover: "#4B5563",
        },
        tertiary: {
          DEFAULT: "#2563EB", // Blue
          hover: "#1D4ED8",
        },
        background: "#F8FAFC",
        surface: "#FFFFFF",
        success: "#16A34A",
        warning: "#CA8A04",
        error: "#DC2626",
        info: "#2563EB",
        muted: "#F1F5F9",
        border: "#CBD5E1",
      },
      fontFamily: {
        serif: ["var(--font-noto-serif)", "Noto Serif", "serif"],
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "8px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(15, 23, 42, 0.04)",
        medium: "0 2px 6px 0 rgba(15, 23, 42, 0.06)",
        large: "0 6px 16px 0 rgba(15, 23, 42, 0.08)",
        overlay: "0 12px 32px 0 rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
}
