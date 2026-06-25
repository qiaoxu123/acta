import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-react";

/**
 * Windows-style title-bar buttons for the frameless window. Rendered only on
 * Windows (macOS uses native traffic lights). Sits inside the TopBar's drag
 * region — these are <button>s, so they're excluded from window dragging.
 */
export function WindowControls() {
  const win = getCurrentWindow();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let un: (() => void) | undefined;
    let alive = true;
    win.isMaximized().then((m) => alive && setMaximized(m));
    win.onResized(() => { win.isMaximized().then((m) => alive && setMaximized(m)); })
      .then((u) => { if (alive) un = u; else u(); });
    return () => { alive = false; un?.(); };
  }, [win]);

  const btn = "flex h-11 w-11 items-center justify-center text-content-subtle transition-colors hover:bg-surface hover:text-content";

  return (
    <div className="flex shrink-0 items-center self-stretch">
      <button className={btn} title="Minimize" onClick={() => win.minimize()}>
        <Minus size={15} />
      </button>
      <button className={btn} title={maximized ? "Restore" : "Maximize"} onClick={() => win.toggleMaximize()}>
        {maximized ? <Copy size={12} /> : <Square size={12} />}
      </button>
      <button
        className="flex h-11 w-11 items-center justify-center text-content-subtle transition-colors hover:bg-urgent hover:text-white"
        title="Close"
        onClick={() => win.close()}
      >
        <X size={16} />
      </button>
    </div>
  );
}
