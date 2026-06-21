import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { parsePath } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";

/**
 * The single reconciler between the router and the tab store. Mounted once in
 * AppShell. On every path change it derives the tab that should be active and
 * either focuses the existing one or materializes it (so deep links, sidebar
 * clicks, and browser back/forward all keep the tab bar consistent).
 */
export function useTabSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    const desc = parsePath(pathname);
    if (!desc) return;
    const st = useTabs.getState();
    // For a list tab, remember the in-list selection (e.g. /reviews/<id>) so
    // re-clicking the tab returns to it instead of the bare list.
    const href = desc.kind === "list" ? pathname : desc.href;
    if (st.activeId === desc.id && st.tabs.some((x) => x.id === desc.id)) {
      st.setHref(desc.id, href);
      return;
    }
    st.openTab({ ...desc, href });
  }, [pathname]);
}
