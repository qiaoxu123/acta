import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ResizablePane } from "./ResizablePane";

/** Top-level frame: resizable sidebar + routed main content. */
export function AppShell() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-surface">
      <ResizablePane storageKey="acta.w.sidebar" defaultWidth={210} min={170} max={320}>
        <Sidebar />
      </ResizablePane>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
