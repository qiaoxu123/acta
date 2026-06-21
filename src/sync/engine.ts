import { exportAll, type Backup } from "@/lib/backup";
import { markAllClean, upsertRaw } from "@/db/mutate";
import { ALL_TABLES } from "@/db/types";
import { davGet, davPut } from "./webdav";
import { DAV_FILE, type WebDavConfig } from "./config";

type Row = Record<string, any>;
const ts = (r: Row) => String(r.updated_at || "");

/**
 * Merge two full snapshots row-by-row with last-write-wins on `updated_at`.
 * Tombstones (rows carrying `deleted_at`) ride the same rule, so a later
 * deletion wins over an earlier edit and vice-versa. Pure & unit-testable.
 */
export function mergeSnapshots(local: Backup, remote: Backup | null): Backup {
  const tables: Backup["tables"] = {};
  for (const t of ALL_TABLES) {
    const map = new Map<string, Row>();
    for (const r of local.tables[t] || []) map.set(r.id as string, r);
    if (remote)
      for (const r of remote.tables[t] || []) {
        const ex = map.get(r.id as string);
        if (!ex || ts(r) > ts(ex)) map.set(r.id as string, r);
      }
    tables[t] = [...map.values()];
  }
  return { app: "acta", version: 1, exported_at: new Date().toISOString(), tables };
}

export interface SyncResult {
  pulled: number; // rows updated locally from the remote
  pushed: number; // local dirty rows contributed to the remote
}

/**
 * One sync cycle: pull the remote snapshot, merge, apply remote-newer rows
 * locally, push the merged snapshot back, mark clean. Converges all devices.
 */
export async function runSync(cfg: WebDavConfig): Promise<SyncResult> {
  const local = await exportAll();
  const remoteText = await davGet(cfg, DAV_FILE);
  const remote = remoteText ? (JSON.parse(remoteText) as Backup) : null;

  const pushed = ALL_TABLES.reduce(
    (n, t) => n + (local.tables[t] || []).filter((r) => (r as Row).sync_status === "dirty").length,
    0,
  );

  const merged = mergeSnapshots(local, remote);

  // Apply rows the merge changed relative to local.
  let pulled = 0;
  for (const t of ALL_TABLES) {
    const localById = new Map<string, Row>();
    for (const r of local.tables[t] || []) localById.set(r.id as string, r);
    const changed: Row[] = [];
    for (const r of merged.tables[t]) {
      const ex = localById.get(r.id as string);
      if (!ex || ts(r) > ts(ex)) changed.push(r);
    }
    if (changed.length) {
      await upsertRaw(t, changed);
      pulled += changed.length;
    }
  }

  await davPut(cfg, DAV_FILE, JSON.stringify(merged));
  await markAllClean();
  return { pulled, pushed };
}
