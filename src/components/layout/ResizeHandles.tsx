import { getCurrentWindow } from "@tauri-apps/api/window";

// A frameless Windows window loses native edge-resize, so we overlay thin
// invisible handles that drive Tauri's startResizeDragging. Eight zones:
// four edges + four corners, each with the right cursor.
type Dir = "North" | "South" | "East" | "West" | "NorthEast" | "NorthWest" | "SouthEast" | "SouthWest";

const HANDLES: { dir: Dir; className: string; cursor: string }[] = [
  { dir: "North", className: "left-0 right-0 top-0 h-1", cursor: "ns-resize" },
  { dir: "South", className: "left-0 right-0 bottom-0 h-1", cursor: "ns-resize" },
  { dir: "West", className: "top-0 bottom-0 left-0 w-1", cursor: "ew-resize" },
  { dir: "East", className: "top-0 bottom-0 right-0 w-1", cursor: "ew-resize" },
  { dir: "NorthWest", className: "top-0 left-0 h-2 w-2", cursor: "nwse-resize" },
  { dir: "NorthEast", className: "top-0 right-0 h-2 w-2", cursor: "nesw-resize" },
  { dir: "SouthWest", className: "bottom-0 left-0 h-2 w-2", cursor: "nesw-resize" },
  { dir: "SouthEast", className: "bottom-0 right-0 h-2 w-2", cursor: "nwse-resize" },
];

export function ResizeHandles() {
  const win = getCurrentWindow();
  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h.dir}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            win.startResizeDragging(h.dir as never);
          }}
          style={{ cursor: h.cursor }}
          className={`fixed z-[100] ${h.className}`}
        />
      ))}
    </>
  );
}
