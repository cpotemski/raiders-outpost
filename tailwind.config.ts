import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular"],
      },
      borderRadius: {
        // im Spiel: eher eckig, nur leicht gerundet
        arc: "12px",
      },
      colors: {
        // alles läuft über CSS-Variablen -> easy nachjustieren
        bg: "var(--bg)",
        panel: "var(--panel)",
        panel2: "var(--panel2)",
        frame: "var(--frame)",
        frame2: "var(--frame2)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",    // cyan/teal
        warn: "var(--warn)",        // amber/orange
        good: "var(--good)",
        bad: "var(--bad)",
      },
      boxShadow: {
        // “glow line” statt fette SaaS-shadows
        arc: "0 0 0 1px var(--frame), 0 10px 30px rgba(0,0,0,.45)",
        arcHover: "0 0 0 1px var(--accent), 0 12px 36px rgba(0,0,0,.55)",
      },
      letterSpacing: {
        hud: "0.08em",
      },
    },
  },
  plugins: [],
} satisfies Config;