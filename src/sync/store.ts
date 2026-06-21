import { create } from "zustand";
import { loadDav } from "./config";
import { runSync } from "./engine";
import { useRefresh } from "@/store/refresh";

interface SyncState {
  syncing: boolean;
  lastSync: string | null;
  lastResult: string | null;
  error: string | null;
  sync: (silent?: boolean) => Promise<void>;
}

const LAST = "acta.sync.last";

export const useSync = create<SyncState>((set, get) => ({
  syncing: false,
  lastSync: localStorage.getItem(LAST),
  lastResult: null,
  error: null,
  sync: async (silent = false) => {
    const cfg = loadDav();
    if (!cfg.enabled || !cfg.url) {
      if (!silent) set({ error: "WebDAV not enabled / configured" });
      return;
    }
    if (get().syncing) return;
    set({ syncing: true, error: null });
    try {
      const r = await runSync(cfg);
      const now = new Date().toISOString();
      localStorage.setItem(LAST, now);
      set({ syncing: false, lastSync: now, lastResult: `↓${r.pulled} ↑${r.pushed}`, error: null });
      if (r.pulled > 0) useRefresh.getState().bump();
    } catch (e) {
      set({ syncing: false, error: String(e instanceof Error ? e.message : e) });
    }
  },
}));

let timer: ReturnType<typeof setInterval> | null = null;

/** Sync once on startup and then every few minutes while WebDAV is enabled. */
export function startAutoSync(): void {
  if (!loadDav().enabled) return;
  useSync.getState().sync(true);
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (loadDav().enabled) useSync.getState().sync(true);
  }, 3 * 60 * 1000);
}
