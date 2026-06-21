/** WebDAV sync configuration, stored locally per device. The password lives in
 *  localStorage (this is a local-first desktop app); it is never committed. */
export interface WebDavConfig {
  enabled: boolean;
  url: string; // base collection URL, e.g. https://dav.jianguoyun.com/dav/acta/
  username: string;
  password: string; // app/client password
}

const KEY = "acta.webdav";

/** The single snapshot file kept on the WebDAV server. */
export const DAV_FILE = "acta-data.json";

export function loadDav(): WebDavConfig {
  const base: WebDavConfig = { enabled: false, url: "", username: "", password: "" };
  try {
    return { ...base, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return base;
  }
}

export function saveDav(c: WebDavConfig): void {
  localStorage.setItem(KEY, JSON.stringify(c));
}
