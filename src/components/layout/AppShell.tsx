import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

/** Top-level frame: fixed sidebar + routed main content. */
export function AppShell() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
