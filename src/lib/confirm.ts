import { confirm as tauriConfirm } from "@tauri-apps/plugin-dialog";

/** Native confirm dialog (Tauri), with a browser fallback for `vite dev`. */
export async function confirmDialog(
  message: string,
  title = "Acta",
): Promise<boolean> {
  try {
    return await tauriConfirm(message, { title, kind: "warning" });
  } catch {
    return window.confirm(message);
  }
}
