import { exportAll, type Backup } from "@/lib/backup";
import { markAllClean, upsertRaw } from "@/db/mutate";
import { ALL_TABLES } from "@/db/types";
import { readStoredFile, storedFileExists, writeStoredFile } from "@/lib/attachments";
import { type SyncTransport } from "./config";

type Row = Record<string, any>;
const ts = (r: Row) => String(r.updated_at || "");

/**
 * Reconcile attachment blobs against the transport's file store. The JSON
 * snapshot only carries `student_files` metadata (keyed by rel_path); the bytes
 * travel here. For every live file row: upload it if it's local-only, download
 * it if it's server-only. Converges files across devices without bloating the
 * snapshot. No-op for transports without blob support (e.g. WebDAV).
 */
async function reconcileFiles(tx: SyncTransport, fileRows: Row[]): Promise<{ up: number; down: number }> {
  if (!tx.listFiles || !tx.getFile || !tx.putFile) return { up: 0, down: 0 };
  const live = fileRows.filter((f) => !f.deleted_at && f.rel_path);
  if (!live.length) return { up: 0, down: 0 };

  // If the server doesn't support blobs yet (e.g. not redeployed), skip quietly
  // rather than failing the whole sync — the metadata snapshot already synced.
  let remoteKeys: Set<string>;
  try {
    remoteKeys = new Set((await tx.listFiles()).map((r) => r.key));
  } catch (e) {
    console.warn("file sync unavailable (server may need redeploy):", e);
    return { up: 0, down: 0 };
  }

  let up = 0, down = 0;
  for (const f of live) {
    const key = String(f.rel_path);
    try {
      const onLocal = await storedFileExists(key);
      if (onLocal && !remoteKeys.has(key)) {
        await tx.putFile!(key, await readStoredFile(key));
        up++;
      } else if (!onLocal && remoteKeys.has(key)) {
        const bytes = await tx.getFile!(key);
        if (bytes) { await writeStoredFile(key, bytes); down++; }
      }
    } catch (e) {
      console.warn(`file sync failed for ${key}:`, e); // isolate; keep going
    }
  }
  return { up, down };
}

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
  filesUp: number; // attachment blobs uploaded
  filesDown: number; // attachment blobs downloaded
}

/**
 * One sync cycle: pull the remote snapshot, merge, apply remote-newer rows
 * locally, push the merged snapshot back, mark clean. Converges all devices.
 */
/**
 * One sync cycle against a transport (WebDAV or PG REST API). Pulls the remote
 * snapshot, merges with local, pushes back, marks clean.
 */
export async function runSync(tx: SyncTransport, fileTx?: SyncTransport): Promise<SyncResult> {
  const local = await exportAll();
  const remoteText = await tx.get();
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

  await tx.put(JSON.stringify(merged));

  // Reconcile attachment blobs through the (possibly different) file backend,
  // using the merged metadata as the source of truth.
  const files = fileTx
    ? await reconcileFiles(fileTx, merged.tables["student_files"] || [])
    : { up: 0, down: 0 };

  await markAllClean();
  return { pulled, pushed, filesUp: files.up, filesDown: files.down };
}
