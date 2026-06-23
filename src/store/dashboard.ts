import { create } from "zustand";

/**
 * Dashboard layout, tuned like macOS desktop widgets: each module card has a
 * size (small / medium / large), can be pinned to the top, collapsed, hidden,
 * and drag-reordered. All persisted so the board the user arranges survives a
 * restart.
 */
export type CardSize = "s" | "m" | "l";
const KEY = "acta.dash.layout";

interface Saved {
  order: string[];
  collapsed: string[];
  hidden: string[];
  pinned: string[];
  sizes: Record<string, CardSize>;
}

interface DashLayout extends Saved {
  toggleCollapsed: (k: string) => void;
  hide: (k: string) => void;
  show: (k: string) => void;
  togglePin: (k: string) => void;
  setSize: (k: string, s: CardSize) => void;
  setOrder: (o: string[]) => void;
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v : [];
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return {
        order: arr(d.order),
        collapsed: arr(d.collapsed),
        hidden: arr(d.hidden),
        pinned: arr(d.pinned),
        sizes: d.sizes && typeof d.sizes === "object" ? d.sizes : {},
      };
    }
  } catch {
    /* ignore */
  }
  return { order: [], collapsed: [], hidden: [], pinned: [], sizes: {} };
}

export const useDashLayout = create<DashLayout>((set, get) => {
  const persist = () => {
    const { order, collapsed, hidden, pinned, sizes } = get();
    localStorage.setItem(KEY, JSON.stringify({ order, collapsed, hidden, pinned, sizes }));
  };
  const toggleIn = (list: string[], k: string) =>
    list.includes(k) ? list.filter((x) => x !== k) : [...list, k];
  return {
    ...load(),
    toggleCollapsed: (k) => {
      set((s) => ({ collapsed: toggleIn(s.collapsed, k) }));
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
    togglePin: (k) => {
      set((s) => ({ pinned: toggleIn(s.pinned, k) }));
      persist();
    },
    setSize: (k, sz) => {
      set((s) => ({ sizes: { ...s.sizes, [k]: sz } }));
      persist();
    },
    setOrder: (o) => {
      set({ order: o });
      persist();
    },
  };
});
