import { create } from "zustand";
import { parsePath, type Tab } from "@/lib/tabs";

/**
 * Open workspace tabs. Route-driven: each tab is an href and only the active
 * route mounts under the router's <Outlet>. State (which tabs are open, order,
 * active tab) persists to localStorage so the workspace survives a restart.
 *
 * Navigation is intentionally NOT done here (no router access in a store): the
 * actions mutate state and return the href to navigate to, and the TabBar /
 * pages issue the actual navigate(). This keeps the data flow one-directional
 * (UI -> navigate -> useTabSync -> store) and avoids feedback loops.
 */
const KEY = "acta.tabs";

function dashboardTab(): Tab {
  return parsePath("/")!;
}

interface Persisted {
  tabs: Tab[];
  activeId: string | null;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as Persisted;
      // Treat persisted tabs as untrusted: keep only those whose href still
      // maps to a known route. Item rows that vanished from the DB are handled
      // later by the item page (they self-close), so we keep them here.
      const tabs = (data.tabs ?? []).filter(
        (x) => x && typeof x.id === "string" && typeof x.href === "string" && parsePath(x.href),
      );
      if (!tabs.some((x) => x.id === "list:dashboard")) tabs.unshift(dashboardTab());
      const activeId = tabs.some((x) => x.id === data.activeId) ? data.activeId : null;
      return { tabs, activeId };
    }
  } catch {
    /* fall through to default */
  }
  return { tabs: [dashboardTab()], activeId: "list:dashboard" };
}

interface TabsState extends Persisted {
  /** Open (or focus) a tab. De-dupes by id; never appends a duplicate. */
  openTab: (desc: Tab) => void;
  /** Mark a tab active (caller navigates). */
  activate: (id: string) => void;
  /** Remember a tab's current href (e.g. a list tab's in-list selection). */
  setHref: (id: string, href: string) => void;
  /** Update an item tab's title once its record is known. */
  setTitle: (id: string, title: string) => void;
  /** Close a tab; returns the href to navigate to if the active tab changed. */
  closeTab: (id: string) => string | null;
  /** Close every closable tab except `id`. */
  closeOthers: (id: string) => string;
}

export const useTabs = create<TabsState>((set, get) => {
  const persist = () => {
    const { tabs, activeId } = get();
    localStorage.setItem(KEY, JSON.stringify({ tabs, activeId }));
  };
  return {
    ...load(),
    openTab: (desc) => {
      set((s) => {
        const existing = s.tabs.find((x) => x.id === desc.id);
        if (existing) {
          // Refresh href, and upgrade the title only if a real one is supplied
          // (URL-materialized item tabs arrive title-less; don't downgrade).
          const tabs = s.tabs.map((x) =>
            x.id === desc.id
              ? { ...x, href: desc.href || x.href, title: desc.title || x.title }
              : x,
          );
          return { tabs, activeId: desc.id };
        }
        return { tabs: [...s.tabs, desc], activeId: desc.id };
      });
      persist();
    },
    activate: (id) => {
      if (get().activeId === id) return;
      set({ activeId: id });
      persist();
    },
    setHref: (id, href) => {
      const tab = get().tabs.find((x) => x.id === id);
      if (!tab || tab.href === href) return;
      set((s) => ({ tabs: s.tabs.map((x) => (x.id === id ? { ...x, href } : x)) }));
      persist();
    },
    setTitle: (id, title) => {
      const tab = get().tabs.find((x) => x.id === id);
      if (!tab || tab.title === title) return;
      set((s) => ({ tabs: s.tabs.map((x) => (x.id === id ? { ...x, title } : x)) }));
      persist();
    },
    closeTab: (id) => {
      const s = get();
      const idx = s.tabs.findIndex((x) => x.id === id);
      if (idx < 0) return null;
      const tabs = s.tabs.filter((x) => x.id !== id);
      let activeId = s.activeId;
      let nextHref: string | null = null;
      if (s.activeId === id) {
        // Activate the right neighbour, else the left, else the first survivor.
        const next = tabs[idx] ?? tabs[idx - 1] ?? tabs[0] ?? null;
        activeId = next?.id ?? null;
        nextHref = next?.href ?? null;
      }
      set({ tabs, activeId });
      persist();
      return nextHref;
    },
    closeOthers: (id) => {
      const keep = get().tabs.filter((x) => x.id === id || !x.closable);
      set({ tabs: keep, activeId: id });
      persist();
      return keep.find((x) => x.id === id)?.href ?? "/";
    },
  };
});
