import { useRef, useState, type ReactNode } from "react";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * A right-side detail panel whose width the user can drag via a handle on its
 * left edge (drag left = wider). Width persists per `storageKey`. Used for the
 * master/detail layout: table fills the left, selected row's detail shows here.
 */
export function ResizableRight({
  storageKey,
  defaultWidth,
  min = 320,
  max = 760,
  children,
}: {
  storageKey: string;
  defaultWidth: number;
  min?: number;
  max?: number;
  children: ReactNode;
}) {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey));
    return saved >= min && saved <= max ? saved : defaultWidth;
  });
  const drag = useRef({ startX: 0, startW: 0, active: false });
  const wRef = useRef(width);
  const apply = (w: number) => {
    wRef.current = w;
    setWidth(w);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, startW: width, active: true };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    // Handle is on the left edge: dragging left widens the panel.
    apply(clamp(drag.current.startW + (drag.current.startX - e.clientX), min, max));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    localStorage.setItem(storageKey, String(Math.round(wRef.current)));
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      className="relative h-full shrink-0 border-l border-border bg-surface"
      style={{ width }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="group absolute inset-y-0 left-0 z-20 w-2.5 -translate-x-1/2 cursor-col-resize"
        style={{ touchAction: "none" }}
      >
        <div className="mx-auto h-full w-0.5 bg-transparent transition-colors group-hover:bg-accent/50" />
      </div>
      <div className="h-full overflow-y-auto">{children}</div>
    </div>
  );
}
