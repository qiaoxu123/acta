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
    listFiles: async () => {
      const res = await fetch(`${cfg.apiUrl}/files`, {
        method: "GET",
        headers: { authorization: `Bearer ${cfg.token}` },
      });
      if (res.status === 404) return [];
      if (!res.ok) throw new Error(`PG files ${res.status} ${res.statusText}`);
      const j = (await res.json()) as { keys?: { key: string; size: number }[] };
      return j.keys ?? [];
    },
    getFile: async (key) => {
      const res = await fetch(`${cfg.apiUrl}/file?key=${encodeURIComponent(key)}`, {
        method: "GET",
        headers: { authorization: `Bearer ${cfg.token}` },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`PG getFile ${res.status} ${res.statusText}`);
      return new Uint8Array(await res.arrayBuffer());
    },
    putFile: async (key, bytes) => {
      // Pass a tight ArrayBuffer (BodyInit) — Tauri's fetch type rejects Uint8Array.
      const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const res = await fetch(`${cfg.apiUrl}/file?key=${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/octet-stream" },
        body: ab,
      });
      if (!res.ok && res.status !== 201 && res.status !== 204) {
        throw new Error(`PG putFile ${res.status} ${res.statusText}`);
      }
    },
  };
}
