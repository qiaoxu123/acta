import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ResizablePane } from "./ResizablePane";
import { TopBar } from "./TopBar";
import { Onboarding } from "@/features/onboarding/Onboarding";

/** Top-level frame: one full-width title bar across the top, then a resizable
 *  sidebar beside the routed main content. */
export function AppShell() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
      <Onboarding />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <ResizablePane storageKey="acta.w.sidebar" defaultWidth={210} min={170} max={320}>
          <Sidebar />
        </ResizablePane>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
