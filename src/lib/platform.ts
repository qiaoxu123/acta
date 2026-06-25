// Lightweight platform detection from the webview UA — avoids pulling in
// @tauri-apps/plugin-os just to branch the title-bar chrome.
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

/** Windows builds run frameless (decorations:false) and draw their own
 *  title-bar controls + resize handles. macOS keeps native traffic lights. */
export const isWindows = /Windows/.test(ua);
export const isMac = /Macintosh|Mac OS X/.test(ua);
