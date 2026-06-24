import { fetch } from "@tauri-apps/plugin-http";
import type { PgConfig, SyncTransport } from "./config";

/**
 * Thin REST transport that speaks to the PG sync API (`server/pg-api/`).
 * The API mirrors WebDAV semantics: GET the latest snapshot, PUT a new one.
 * Uses Tauri's HTTP plugin so requests bypass the webview CSP.
 */
export function createPgTransport(cfg: PgConfig): SyncTransport {
  const hdrs = {
    authorization: `Bearer ${cfg.token}`,
    "content-type": "application/json",
  };
  return {
    get: async () => {
      const res = await fetch(`${cfg.apiUrl}/snapshot`, {
        method: "GET",
        headers: hdrs,
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PG GET ${res.status} ${res.statusText}`);
      return await res.text();
    },
    put: async (body) => {
      const res = await fetch(`${cfg.apiUrl}/snapshot`, {
        method: "PUT",
        headers: hdrs,
        body,
      });
      if (!res.ok && res.status !== 201 && res.status !== 204) {
        throw new Error(`PG PUT ${res.status} ${res.statusText}`);
      }
    },
  };
}
