import { invoke } from "@tauri-apps/api/core";

/**
 * Open a URL in the system browser. Tauri's webview ignores `target="_blank"`,
 * so external links must go through the opener plugin. Falls back to window.open
 * outside a Tauri context (e.g. plain-browser dev).
 */
export function openExternal(url: string | null | undefined): void {
  if (!url) return;
  invoke("plugin:opener|open_url", { url }).catch(() => {
    try {
      window.open(url, "_blank", "noopener");
    } catch {
      /* nothing else to try */
    }
  });
}
