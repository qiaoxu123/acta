import { execute, getDb } from "./client";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";

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

/** Insert a row, generating id + timestamps. Returns the new id. */
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
  const db = await getDb();
  for (const row of rows) {
    const cols = Object.keys(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    await db.execute(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
      cols.map((c) => row[c]),
    );
  }
}
