import { useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * A fixed-position pane whose width the user can drag via a handle on its right
 * edge. The width persists per `storageKey` so the layout is remembered.
 */
export function ResizablePane({
  storageKey,
  defaultWidth,
  min = 200,
  max = 560,
  children,
  className,
}: {
  storageKey: string;
  defaultWidth: number;
  min?: number;
  max?: number;
  children: ReactNode;
  className?: string;
}) {
  const [width, setWidth] = useState(() => {
    const saved = Number(localStorage.getItem(storageKey));
    return saved >= min && saved <= max ? saved : defaultWidth;
  });
  const drag = useRef({ startX: 0, startW: 0, active: false });
  const widthRef = useRef(width);

  const apply = (w: number) => {
    widthRef.current = w;
    setWidth(w);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startX: e.clientX, startW: width, active: true };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    apply(clamp(drag.current.startW + (e.clientX - drag.current.startX), min, max));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    localStorage.setItem(storageKey, String(Math.round(widthRef.current)));
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };

  return (
    <div
      className={clsx("relative h-full shrink-0", className)}
      style={{ width }}
    >
      {children}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="group absolute inset-y-0 right-0 z-20 w-2.5 translate-x-1/2 cursor-col-resize"
        style={{ touchAction: "none" }}
      >
        <div className="mx-auto h-full w-0.5 bg-transparent transition-colors group-hover:bg-accent/50" />
      </div>
    </div>
  );
}
