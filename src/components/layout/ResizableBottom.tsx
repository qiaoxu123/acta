import { useRef, useState, type ReactNode } from "react";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * A bottom panel whose height the user can drag via a handle on its top edge.
 * Used for the master/detail layout: the table fills the space above, the
 * selected row's detail shows here. Height persists per `storageKey`.
 */
export function ResizableBottom({
  storageKey,
  defaultHeight,
  min = 150,
  max = 640,
  children,
}: {
  storageKey: string;
  defaultHeight: number;
  min?: number;
  max?: number;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey));
    return saved >= min && saved <= max ? saved : defaultHeight;
  });
  const drag = useRef({ startY: 0, startH: 0, active: false });
  const hRef = useRef(height);
  const apply = (h: number) => {
    hRef.current = h;
    setHeight(h);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startH: height, active: true };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    // Dragging up makes the panel taller.
    apply(clamp(drag.current.startH + (drag.current.startY - e.clientY), min, max));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    localStorage.setItem(storageKey, String(Math.round(hRef.current)));
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      className="relative shrink-0 border-t border-border bg-surface"
      style={{ height }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="group absolute inset-x-0 top-0 z-20 h-2.5 -translate-y-1/2 cursor-row-resize"
        style={{ touchAction: "none" }}
      >
        <div className="h-0.5 w-full bg-transparent transition-colors group-hover:bg-accent/50" />
      </div>
      <div className="h-full overflow-y-auto">{children}</div>
    </div>
  );
}
