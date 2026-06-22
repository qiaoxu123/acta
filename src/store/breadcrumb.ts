import { create } from "zustand";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Holds the breadcrumb trail for the *current* item page so the top bar can
 * render a wolai-style path (section › record) with the record's real title.
 *
 * Item pages publish their trail (keyed to the pathname they apply to); the top
 * bar only renders it when `path` matches the live location, otherwise it falls
 * back to a section-only crumb derived straight from the route. The pathname
 * guard keeps a stale trail from a previous item from leaking onto a list page.
 */
interface BreadcrumbState {
  path: string | null;
  trail: Crumb[];
  publish: (path: string, trail: Crumb[]) => void;
  clear: (path: string) => void;
}

export const useBreadcrumb = create<BreadcrumbState>((set, get) => ({
  path: null,
  trail: [],
  publish: (path, trail) => set({ path, trail }),
  clear: (path) => {
    if (get().path === path) set({ path: null, trail: [] });
  },
}));
