import { create } from "zustand";

/**
 * Global state for the right-side preview panel, shared by every list page.
 *  - pinned:    the panel stays open across selections / navigation, even with
 *               nothing selected.
 *  - collapsed: the panel is hidden; a thin strip lets the user reopen it.
 * Persisted so the layout choice survives a restart (mirrors the panel-width
 * persistence already in ResizableRight).
 */
const KEY = "acta.dock";

interface DockState {
  pinned: boolean;
  collapsed: boolean;
  togglePin: () => void;
  toggleCollapsed: () => void;
}

function load(): { pinned: boolean; collapsed: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { pinned: !!d.pinned, collapsed: !!d.collapsed };
    }
  } catch {
    /* ignore */
  }
  return { pinned: false, collapsed: false };
}

export const useDock = create<DockState>((set, get) => {
  const persist = () => {
    const { pinned, collapsed } = get();
    localStorage.setItem(KEY, JSON.stringify({ pinned, collapsed }));
  };
  return {
    ...load(),
    togglePin: () => {
      set((s) => ({ pinned: !s.pinned }));
      persist();
    },
    toggleCollapsed: () => {
      set((s) => ({ collapsed: !s.collapsed }));
      persist();
    },
  };
});
