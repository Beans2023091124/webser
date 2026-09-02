import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Webser electric blue, sampled from the logo mark (#1463FF).
        brand: {
          50: "#eaf1ff",
          100: "#d6e7ff",
          200: "#adcfff",
          300: "#7ab1ff",
          400: "#478fff",
          500: "#2570ff",
          600: "#1463ff",
          700: "#1150db",
          800: "#0e3ead",
          900: "#0b2e7f",
          950: "#081f57",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
    },
  },
  plugins: [],
};

export default config;
