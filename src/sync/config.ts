/** WebDAV sync configuration, stored locally per device. The password lives in
 *  localStorage (this is a local-first desktop app); it is never committed. */
export interface WebDavConfig {
  enabled: boolean;
  url: string; // base collection URL, e.g. https://dav.jianguoyun.com/dav/acta/
  username: string;
  password: string; // app/client password
}

/** PostgreSQL sync configuration — a thin REST API sitting in front of PG. */
export interface PgConfig {
  enabled: boolean;
  /** Full URL of the PG sync API, e.g. https://your-server.com:3001 */
  apiUrl: string;
  /** Bearer token shared with the server-side API. */
  token: string;
}

const DAV_KEY = "acta.webdav";
const PG_KEY = "acta.pgsync";
const FILE_BACKEND_KEY = "acta.filebackend";

/** Where attachment file *bytes* are stored. Metadata always rides the snapshot.
 *  - "auto"  : follow the active snapshot transport
 *  - "webdav": store files on WebDAV (works even while the snapshot uses PG)
 *  - "pg"    : store files on the PG blob API */
export type FileBackend = "auto" | "webdav" | "pg";

export function loadFileBackend(): FileBackend {
  const v = localStorage.getItem(FILE_BACKEND_KEY);
  return v === "webdav" || v === "pg" ? v : "auto";
}
export function saveFileBackend(v: FileBackend): void {
  localStorage.setItem(FILE_BACKEND_KEY, v);
}

/** The single snapshot file kept on the WebDAV server / to PUT against PG. */
export const DAV_FILE = "acta-data.json";

/** Transport interface for a sync backend — mirrors the two WebDAV ops. */
export interface SyncTransport {
  /** GET the remote snapshot; returns the text, or null if 404/not-yet. */
  get(): Promise<string | null>;
  /** PUT (create/overwrite) the remote snapshot. */
  put(body: string): Promise<void>;
  /** List blob keys present on the server (no bodies). Optional — PG only. */
  listFiles?(): Promise<{ key: string; size: number }[]>;
  /** Download a blob by key; null if 404. Optional — PG only. */
  getFile?(key: string): Promise<Uint8Array | null>;
  /** Upload (create/overwrite) a blob by key. Optional — PG only. */
  putFile?(key: string, bytes: Uint8Array): Promise<void>;
}

export function loadDav(): WebDavConfig {
  const base: WebDavConfig = { enabled: false, url: "", username: "", password: "" };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(DAV_KEY) || "{}") };
  } catch {
    return base;
  }
}

export function saveDav(c: WebDavConfig): void {
  localStorage.setItem(DAV_KEY, JSON.stringify(c));
}

export function loadPg(): PgConfig {
  const base: PgConfig = { enabled: false, apiUrl: "", token: "" };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(PG_KEY) || "{}") };
  } catch {
    return base;
  }
}

export function savePg(c: PgConfig): void {
  localStorage.setItem(PG_KEY, JSON.stringify(c));
}
