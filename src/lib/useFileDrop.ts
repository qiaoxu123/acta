import { useEffect, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

/**
 * Tauri intercepts OS file drops before the webview, so HTML5 drag-and-drop
 * never sees File objects. We subscribe to the webview's native drag-drop event
 * (which carries real absolute paths). Position-based hit-testing proved
 * unreliable (physical-vs-CSS pixel origin), so while this hook is mounted it
 * accepts any drop over the window — fine because only one attachments zone is
 * mounted at a time (the selected student's detail panel).
 *
 * Returns `dragOver` — true while files hover over the window — for styling.
 */
export function useFileDrop(
  onDrop: (paths: string[]) => void,
  enabled = true,
): boolean {
  const [dragOver, setDragOver] = useState(false);
  const onDropRef = useRef(onDrop);
  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);

  useEffect(() => {
    if (!enabled) return;
    let unlisten: (() => void) | undefined;
    let active = true;

    getCurrentWebview()
      .onDragDropEvent((event) => {
        const p = event.payload;
        if (p.type === "enter" || p.type === "over") {
          setDragOver(true);
        } else if (p.type === "leave") {
          setDragOver(false);
        } else if (p.type === "drop") {
          setDragOver(false);
          if (p.paths.length) onDropRef.current(p.paths);
        }
      })
      .then((un) => {
        if (active) unlisten = un;
        else un();
      });

    return () => {
      active = false;
      unlisten?.();
    };
  }, [enabled]);

  return dragOver;
}
