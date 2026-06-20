export type Theme = "light" | "dark";

const KEY = "acta.theme";

/** Read the persisted theme, defaulting to the OS preference. */
export function getStoredTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Toggle the `dark` class on <html> so CSS variables switch palettes. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(KEY, theme);
}

export function applyStoredTheme(): void {
  applyTheme(getStoredTheme());
}
