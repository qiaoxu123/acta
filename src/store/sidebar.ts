import { create } from "zustand";

const KEY = "acta.sidebar.collapsed";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

/** Shared sidebar collapse state — AppShell narrows the whole column to an
 *  icon strip when collapsed, so it isn't just a wide column with centered icons. */
export const useSidebar = create<SidebarState>((set, get) => ({
  collapsed: localStorage.getItem(KEY) === "1",
  toggle: () => {
    const v = !get().collapsed;
    localStorage.setItem(KEY, v ? "1" : "0");
    set({ collapsed: v });
  },
}));
