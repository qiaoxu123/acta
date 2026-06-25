import { create } from "zustand";
import { loadDav, loadFileBackend, loadPg, type SyncTransport, type WebDavConfig } from "./config";
import { davGet, davGetFile, davListFiles, davPut, davPutFile } from "./webdav";
import { createPgTransport } from "./postgres";
import { runSync } from "./engine";
import { DAV_FILE } from "./config";
import { useRefresh } from "@/store/refresh";

function activeTransport(): { label: string; tx: SyncTransport } | null {
  // PG takes priority if both are configured; WebDAV is the fallback.
  const pg = loadPg();
  if (pg.enabled && pg.apiUrl && pg.token) {
    return { label: "PG", tx: createPgTransport(pg) };
  }
  const dav = loadDav();
  if (dav.enabled && dav.url) {
    return {
      label: "WebDAV",
      tx: { get: () => davGet(dav, DAV_FILE), put: (b) => davPut(dav, DAV_FILE, b) },
    };
  }
  return null;
}

/** A blob-only transport backed by WebDAV (snapshot ops are no-ops). */
function webdavFileTransport(dav: WebDavConfig): SyncTransport {
  return {
    get: async () => null,
    put: async () => {},
    listFiles: () => davListFiles(dav),
    getFile: (k) => davGetFile(dav, k),
    putFile: (k, b) => davPutFile(dav, k, b),
  };
}

/** Resolve where attachment bytes go, independent of the snapshot transport. */
function resolveFileTransport(active: SyncTransport): SyncTransport | undefined {
  const mode = loadFileBackend();
  if (mode === "webdav") {
    const dav = loadDav();
    return dav.url && dav.username && dav.password ? webdavFileTransport(dav) : undefined;
  }
  if (mode === "pg") {
    const pg = loadPg();
    return pg.apiUrl && pg.token ? createPgTransport(pg) : undefined;
  }
  return active; // "auto" — follow the snapshot transport
}

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
    const active = activeTransport();
    if (!active) {
      if (!silent) set({ error: "No sync provider enabled / configured" });
      return;
    }
    if (get().syncing) return;
    set({ syncing: true, error: null });
    try {
      const r = await runSync(active.tx, resolveFileTransport(active.tx));
      const now = new Date().toISOString();
      localStorage.setItem(LAST, now);
      const fileNote = r.filesUp || r.filesDown ? ` 📎↓${r.filesDown} ↑${r.filesUp}` : "";
      set({
        syncing: false,
        lastSync: now,
        lastResult: `[${active.label}] ↓${r.pulled} ↑${r.pushed}${fileNote}`,
        error: null,
      });
      if (r.pulled > 0 || r.filesDown > 0) useRefresh.getState().bump();
    } catch (e) {
      set({ syncing: false, error: String(e instanceof Error ? e.message : e) });
    }
  },
}));

let timer: ReturnType<typeof setInterval> | null = null;

/** Sync once on startup and then every few minutes while a provider is enabled. */
export function startAutoSync(): void {
  if (!activeTransport()) return;
  useSync.getState().sync(true);
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (activeTransport()) useSync.getState().sync(true);
  }, 3 * 60 * 1000);
}
