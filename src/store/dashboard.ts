import { create } from "zustand";

/**
 * Dashboard layout: which module cards are collapsed/hidden, their order, and
 * the row density. Persisted so the overview the user tunes survives restart.
 */
export type Density = "compact" | "comfortable";
const KEY = "acta.dash.layout";

interface Saved {
  order: string[];
  collapsed: string[];
  hidden: string[];
  density: Density;
}

interface DashLayout extends Saved {
  toggleCollapsed: (k: string) => void;
  hide: (k: string) => void;
  show: (k: string) => void;
  setOrder: (o: string[]) => void;
  setDensity: (d: Density) => void;
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        order: Array.isArray(d.order) ? d.order : [],
        collapsed: Array.isArray(d.collapsed) ? d.collapsed : [],
        hidden: Array.isArray(d.hidden) ? d.hidden : [],
        density: d.density === "comfortable" ? "comfortable" : "compact",
      };
    }
  } catch {
    /* ignore */
  }
  return { order: [], collapsed: [], hidden: [], density: "compact" };
}

export const useDashLayout = create<DashLayout>((set, get) => {
  const persist = () => {
    const { order, collapsed, hidden, density } = get();
    localStorage.setItem(KEY, JSON.stringify({ order, collapsed, hidden, density }));
  };
  return {
    ...load(),
    toggleCollapsed: (k) => {
      set((s) => ({
        collapsed: s.collapsed.includes(k)
          ? s.collapsed.filter((x) => x !== k)
          : [...s.collapsed, k],
      }));
      persist();
    },
    hide: (k) => {
      set((s) => ({ hidden: s.hidden.includes(k) ? s.hidden : [...s.hidden, k] }));
      persist();
    },
    show: (k) => {
      set((s) => ({ hidden: s.hidden.filter((x) => x !== k) }));
      persist();
    },
    setOrder: (o) => {
      set({ order: o });
      persist();
    },
    setDensity: (d) => {
      set({ density: d });
      persist();
    },
  };
});
