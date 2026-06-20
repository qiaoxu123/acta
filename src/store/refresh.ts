import { create } from "zustand";

/**
 * A tiny global "data changed" signal. Any write bumps the counter; views that
 * read derived data (dashboard, lists) depend on `tick` to re-query. Keeps the
 * app reactive without a full data-fetching library at this stage.
 */
interface RefreshState {
  tick: number;
  bump: () => void;
}

export const useRefresh = create<RefreshState>((set) => ({
  tick: 0,
  bump: () => set((s) => ({ tick: s.tick + 1 })),
}));
