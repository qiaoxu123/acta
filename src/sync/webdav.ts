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

// --- attachment blobs ---
// Files live in a flat `files/` collection. Keys (rel_paths, which contain
// slashes and possibly Chinese) are base64url-encoded into a single URL-safe
// filename, sidestepping WebDAV percent-encoding ambiguity.
const FILES_DIR = "files";

function b64urlEncode(s: string): string {
  const utf8 = new TextEncoder().encode(s);
  let bin = "";
  for (const b of utf8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s: string): string {
  let b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "="; // atob needs padding
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** MKCOL one collection (idempotent — 405/301 mean it already exists). */
async function mkcol(c: WebDavConfig, url: string): Promise<void> {
  const res = await fetch(url, { method: "MKCOL", headers: { Authorization: auth(c) } });
  if (res.ok || res.status === 405 || res.status === 301) return;
  if (res.status === 401 || res.status === 403) throw new Error(`WebDAV MKCOL ${res.status}`);
  // other statuses (e.g. 409 if it already exists oddly): tolerate
}

/** Ensure both the base collection and files/ exist (MKCOL only creates one
 *  level, and the base may not exist yet if the snapshot lives on PG). */
async function davEnsureFilesDir(c: WebDavConfig): Promise<void> {
  await mkcol(c, join(c.url, "")); // base collection (…/acta/)
  await mkcol(c, join(c.url, FILES_DIR + "/"));
}

export async function davListFiles(c: WebDavConfig): Promise<{ key: string; size: number }[]> {
  const res = await fetch(join(c.url, FILES_DIR + "/"), {
    method: "PROPFIND",
    headers: { Authorization: auth(c), Depth: "1", "Content-Type": "application/xml" },
    body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:getcontentlength/></d:prop></d:propfind>',
  });
  if (res.status === 404) return []; // dir not created yet
  if (!res.ok && res.status !== 207) throw new Error(`WebDAV PROPFIND ${res.status} ${res.statusText}`);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const responses = Array.from(doc.getElementsByTagNameNS("DAV:", "response"));
  const out: { key: string; size: number }[] = [];
  for (const r of responses) {
    const href = r.getElementsByTagNameNS("DAV:", "href")[0]?.textContent || "";
    if (!href || href.endsWith("/")) continue; // collection w/ trailing slash
    const seg = href.split("/").filter(Boolean).pop() || "";
    if (seg === FILES_DIR) continue; // the collection itself (no trailing slash)
    let name = seg;
    try { name = decodeURIComponent(seg); } catch { /* already decoded */ }
    let key: string;
    try { key = b64urlDecode(name); } catch { continue; } // not one of ours
    const lenStr = r.getElementsByTagNameNS("DAV:", "getcontentlength")[0]?.textContent;
    out.push({ key, size: lenStr ? Number(lenStr) : 0 });
  }
  return out;
}

export async function davGetFile(c: WebDavConfig, key: string): Promise<Uint8Array | null> {
  const res = await fetch(join(c.url, `${FILES_DIR}/${b64urlEncode(key)}`), {
    method: "GET",
    headers: { Authorization: auth(c) },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`WebDAV GET file ${res.status} ${res.statusText}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function davPutFile(c: WebDavConfig, key: string, bytes: Uint8Array): Promise<void> {
  await davEnsureFilesDir(c);
  const ab = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const res = await fetch(join(c.url, `${FILES_DIR}/${b64urlEncode(key)}`), {
    method: "PUT",
    headers: { Authorization: auth(c), "Content-Type": "application/octet-stream" },
    body: ab,
  });
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`WebDAV PUT file ${res.status} ${res.statusText}`);
  }
}
