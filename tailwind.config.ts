import type { Config } from "tailwindcss";

// Brand tokens (spec §2): navy #0B1F3A, emerald #10B981, warm amber #F59E0B, slate neutrals.
// Every colour is a CSS variable (app/globals.css) so light and dark mode share one class vocabulary.
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./content/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1180px" } },
    extend: {
      colors: {
        navy: v("navy"), // fixed brand navy for bands, both themes
        brand: { DEFAULT: v("brand"), text: v("brand-text"), soft: v("brand-soft") }, // emerald
        "on-brand": v("on-brand"),
        highlight: { DEFAULT: v("highlight"), soft: v("highlight-soft") }, // amber
        primary: { DEFAULT: v("primary"), hover: v("primary-hover") },
        "on-primary": v("on-primary"),
        page: v("page"),
        surface: v("surface"),
        muted: v("muted"),
        ink: v("ink"),
        body: v("body"),
        subtle: v("subtle"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        warning: { DEFAULT: v("warning"), soft: v("warning-soft") },
        danger: { DEFAULT: v("danger"), soft: v("danger-soft") },
        info: { DEFAULT: v("info"), soft: v("info-soft") },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
        mono: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"], // figures use Inter tabular-nums
      },
      borderRadius: { md: "8px", lg: "12px", xl: "16px" },
      boxShadow: { soft: "0 1px 2px rgb(11 31 58 / 0.04), 0 4px 16px rgb(11 31 58 / 0.06)" },
      maxWidth: { measure: "68ch" },
    },
  },
  plugins: [],
};
export default config;
