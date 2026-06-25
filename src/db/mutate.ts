import { execute, select } from "./client";
import { newId } from "../lib/ids";
import { nowIso } from "../lib/dates";
import { ALL_TABLES } from "./types";

let _cachedOwner: string | null | undefined;
async function getOwnerId(): Promise<string | null> {
  if (_cachedOwner !== undefined) return _cachedOwner;
  try {
    const rows = await select<{ user_id: string }>("SELECT user_id FROM sessions WHERE id='current'");
    _cachedOwner = rows[0]?.user_id ?? null;
  } catch { _cachedOwner = null; }
  return _cachedOwner;
}

/** Tables that participate in per-user isolation. */
const OWNED_TABLES = new Set(ALL_TABLES.filter(t => !["users","sessions","groups","group_members","shared_items"].includes(t)));


/**
 * The single write gateway for the whole app. Every create/update/delete goes
 * through here so the sync bookkeeping (`created_at`, `updated_at`,
 * `deleted_at`, `sync_status`) is stamped consistently. UI and repositories
 * never hand-write INSERT/UPDATE SQL — that keeps the data layer ready for the
 * future cloud-sync engine, which relies on these fields for change tracking.
 *
 * Column names are always supplied by our own code (never user input), so
 * interpolating them into SQL is safe; all *values* are parameterized.
 */

type Row = Record<string, unknown>;

/** Insert a row, generating id + timestamps + owner_id. Returns the new id. */
export async function insert(table: string, data: Row): Promise<string> {
  const id = (data.id as string) || newId();
  const ts = nowIso();
  const row: Row = {
    ...data,
    id,
    created_at: ts,
    updated_at: ts,
    deleted_at: null,
    sync_status: "dirty",
  };
  // Stamp owner_id on isolated tables if not already provided
  if (OWNED_TABLES.has(table as any) && !row.owner_id) {
    const oid = await getOwnerId();
    if (oid) row.owner_id = oid;
  }

  const cols = Object.keys(row);
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  await execute(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
    cols.map((c) => row[c]),
  );
  return id;
}

/** Patch a row by id, refreshing updated_at and marking it dirty. */
export async function update(
  table: string,
  id: string,
  patch: Row,
): Promise<void> {
  const row: Row = {
    ...patch,
    updated_at: nowIso(),
    sync_status: "dirty",
  };
  delete row.id; // never overwrite the primary key

  const cols = Object.keys(row);
  const assignments = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  await execute(`UPDATE ${table} SET ${assignments} WHERE id = $${cols.length + 1}`, [
    ...cols.map((c) => row[c]),
    id,
  ]);
}

/** Soft-delete: tombstone the row so a future sync can propagate the deletion. */
export async function softDelete(table: string, id: string): Promise<void> {
  const ts = nowIso();
  await execute(
    `UPDATE ${table} SET deleted_at = $1, updated_at = $2, sync_status = 'dirty' WHERE id = $3`,
    [ts, ts, id],
  );
}

/** Hard-delete every row in a table — used only by full DB import/reset. */
export async function truncate(table: string): Promise<void> {
  await execute(`DELETE FROM ${table}`);
}

/** Bulk insert pre-shaped rows verbatim (used by JSON import). Values only. */
export async function insertRaw(table: string, rows: Row[]): Promise<void> {
  if (rows.length === 0) return;
  for (const row of rows) {
    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    await execute(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      cols.map((c) => row[c]),
    );
  }
}

/** Insert-or-replace rows by primary key (used by the sync merge). */
export async function upsertRaw(table: string, rows: Row[]): Promise<void> {
  for (const row of rows) {
    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    await execute(
      `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      cols.map((c) => row[c]),
    );
  }
}

/** Mark every row clean after a successful sync push. */
export async function markAllClean(): Promise<void> {
  for (const t of ALL_TABLES) {
    await execute(`UPDATE ${t} SET sync_status = 'clean' WHERE sync_status = 'dirty'`);
  }
}
