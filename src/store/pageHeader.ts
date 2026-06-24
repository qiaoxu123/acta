import { create } from "zustand";

/**
 * Lets a page's <Toolbar> render its subtitle/actions into a slot in the top
 * bar (filling the otherwise-empty strip next to the breadcrumb) instead of its
 * own full-height band. The top bar publishes the slot DOM node here; Toolbar
 * portals into it.
 */
interface PageHeaderState {
  el: HTMLElement | null;
  setEl: (el: HTMLElement | null) => void;
}

export const usePageHeader = create<PageHeaderState>((set, get) => ({
  el: null,
  setEl: (el) => {
    if (get().el !== el) set({ el });
  },
}));
