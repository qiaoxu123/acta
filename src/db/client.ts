import Database from "@tauri-apps/plugin-sql";

/**
 * Single shared SQLite handle. The database file (`acta.db`) lives in the
 * app's data directory; the schema is created/migrated Rust-side by
 * `tauri-plugin-sql` before the webview loads (see src-tauri/src/lib.rs).
 */
let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:acta.db");
  }
  return dbPromise;
}

/** Run a SELECT and return typed rows. */
export async function select<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const db = await getDb();
  return db.select<T[]>(sql, params);
}

/** Run a write statement (INSERT/UPDATE/DELETE). Prefer the helpers in
 *  `mutate.ts` over calling this directly so sync bookkeeping stays correct. */
export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  const db = await getDb();
  await db.execute(sql, params);
}
