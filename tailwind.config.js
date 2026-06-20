/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Zotero-ish neutral surfaces + a calm accent.
        surface: {
          DEFAULT: "var(--surface)",
          sunken: "var(--surface-sunken)",
          raised: "var(--surface-raised)",
        },
        border: "var(--border)",
        content: {
          DEFAULT: "var(--content)",
          muted: "var(--content-muted)",
          subtle: "var(--content-subtle)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          fg: "var(--accent-fg)",
          soft: "var(--accent-soft)",
        },
        // Deadline urgency scale.
        urgent: "#dc2626",
        warn: "#d97706",
        ok: "#16a34a",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
      },
    },
  },
  plugins: [],
};
