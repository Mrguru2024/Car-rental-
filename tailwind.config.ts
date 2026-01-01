import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand Colors (Locked - per Brandcolors.md)
        brand: {
          navy: "#0B1C2D", // App shell, header, footer
          blue: "#1F6AE1", // Links, tabs, active states
          green: "#2ECC71", // Primary CTA (Book / Pay / Confirm)
          white: "#F5F7FA", // Page background
          gray: "#6B7280", // Secondary text, muted labels
          // Dark mode variants
          "navy-dark": "#050E18",
          "navy-light": "#1A2F47", // Lighter for dark mode card backgrounds
          "blue-dark": "#1554B8",
          "blue-light": "#4A8AED",
          "green-dark": "#27AE60",
          "green-light": "#52E88A",
        },
      },
    },
  },
  plugins: [],
};

export default config;