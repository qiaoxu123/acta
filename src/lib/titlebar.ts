import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Toggle window maximize/zoom — wired to double-clicks on the custom title-bar
 * drag regions, since the overlay title bar doesn't forward macOS's native
 * double-click-to-zoom to the webview.
 */
export function toggleMaximize(): void {
  getCurrentWindow()
    .toggleMaximize()
    .catch(() => {
      /* not in a Tauri window (e.g. plain browser dev) */
    });
}

/**
 * Double-click handler for a title-bar drag region: zoom the window, but ignore
 * clicks on interactive children (tabs, buttons) so only the empty bar zooms.
 */
export function onTitlebarDoubleClick(e: React.MouseEvent): void {
  const el = e.target as HTMLElement;
  if (el.closest("button") || el.closest("[data-tab]")) return;
  toggleMaximize();
}
