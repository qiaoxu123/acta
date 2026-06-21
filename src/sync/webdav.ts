import { fetch } from "@tauri-apps/plugin-http";
import type { WebDavConfig } from "./config";

/**
 * Minimal WebDAV client. Requests go through Tauri's HTTP plugin (Rust side),
 * so they bypass the webview CSP and can reach any user-configured host.
 */
function auth(c: WebDavConfig): string {
  // WebDAV credentials are ASCII; btoa is fine.
  return "Basic " + btoa(`${c.username}:${c.password}`);
}
function join(base: string, file: string): string {
  return base.replace(/\/+$/, "") + "/" + file;
}

/** GET a file; returns its text, or null if it does not exist yet (404). */
export async function davGet(c: WebDavConfig, file: string): Promise<string | null> {
  const res = await fetch(join(c.url, file), {
    method: "GET",
    headers: { Authorization: auth(c) },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`WebDAV GET ${res.status} ${res.statusText}`);
  return await res.text();
}

/** PUT (create/overwrite) a file. */
export async function davPut(c: WebDavConfig, file: string, body: string): Promise<void> {
  const res = await fetch(join(c.url, file), {
    method: "PUT",
    headers: { Authorization: auth(c), "Content-Type": "application/json" },
    body,
  });
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`WebDAV PUT ${res.status} ${res.statusText}`);
  }
}

/** Probe the collection URL — used by the "Test connection" button. */
export async function davCheck(c: WebDavConfig): Promise<void> {
  const res = await fetch(c.url.replace(/\/+$/, "") + "/", {
    method: "GET",
    headers: { Authorization: auth(c) },
  });
  // 200/207 ok; 404/405 mean reachable+authed but method/path quirk — still fine.
  if (res.status === 401 || res.status === 403)
    throw new Error(`认证失败 (${res.status})：检查用户名 / 应用密码`);
  if (res.status >= 500) throw new Error(`服务器错误 (${res.status})`);
}
