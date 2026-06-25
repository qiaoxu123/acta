import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ResizablePane } from "./ResizablePane";
import { TopBar } from "./TopBar";
import { AuthGate } from "@/features/auth/AuthGate";
import { Onboarding } from "@/features/onboarding/Onboarding";
import { useSidebar } from "@/store/sidebar";

const COLLAPSED_WIDTH = 56;

/** Top-level frame: one full-width title bar across the top, then a sidebar
 *  beside the routed main content. The sidebar is resizable when expanded and
 *  a fixed icon strip when collapsed. */
export function AppShell() {
  const collapsed = useSidebar((s) => s.collapsed);
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface">
      <AuthGate />
      <Onboarding />
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {collapsed ? (
          <div className="h-full shrink-0" style={{ width: COLLAPSED_WIDTH }}>
            <Sidebar />
          </div>
        ) : (
          <ResizablePane storageKey="acta.w.sidebar" defaultWidth={210} min={170} max={320}>
            <Sidebar />
          </ResizablePane>
        )}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
