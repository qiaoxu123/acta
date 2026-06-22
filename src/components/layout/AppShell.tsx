import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ResizablePane } from "./ResizablePane";
import { TopBar } from "./TopBar";

/** Top-level frame: resizable sidebar + breadcrumb-headed, routed main content. */
export function AppShell() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-surface">
      <ResizablePane storageKey="acta.w.sidebar" defaultWidth={210} min={170} max={320}>
        <Sidebar />
      </ResizablePane>
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
