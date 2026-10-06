import type { Config } from "tailwindcss";

// Colours are sampled from the Funding Lab logo (deep teal-blue "Funding", teal "Lab", leaf green).
// Every text/background pair used in the app meets WCAG AA; see docs/brand.md.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1120px" } },
    extend: {
      colors: {
        navy: { DEFAULT: "#0C3447", 700: "#14506A", 900: "#071D28" },
        teal: { DEFAULT: "#17716F", text: "#17716F", bright: "#2F9A9A", soft: "#E3F3F1" },
        ocean: "#2E86A0",
        leaf: { DEFAULT: "#64B063", onnavy: "#7FD18A" },
        page: "#F4F8F8",
        muted: "#E8F0F0",
        ink: "#0C3447",
        body: "#1D3340",
        subtle: "#556B78",
        line: { DEFAULT: "#D3E0E1", strong: "#7A909B" },
        warning: { DEFAULT: "#8A5300", soft: "#FFF2DC" },
        danger: { DEFAULT: "#B4322A", soft: "#FBE5E2" },
        info: { DEFAULT: "#2A5DB0", soft: "#E3ECFA" },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: { md: "8px", lg: "10px", xl: "14px" },
      maxWidth: { measure: "68ch" },
    },
  },
  plugins: [],
};
export default config;
