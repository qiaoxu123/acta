import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { SqlDriver } from "../src/db/client";

/**
 * A `SqlDriver` backed by Node's built-in `node:sqlite` (zero dependencies),
 * pointed at the same database file the Tauri app uses. WAL mode lets the app
 * and this service access the file concurrently.
 *
 * The repositories emit `$1, $2` placeholders (the tauri-plugin-sql / Postgres
 * style). `node:sqlite` binds positionally with `?`, so we translate `$N → ?`;
 * because we always generate placeholders in ascending order matching the
 * params array, the left-to-right substitution preserves binding order.
 */
function translate(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

export function createNodeDriver(dbPath: string): SqlDriver {
  mkdirSync(dirname(dbPath), { recursive: true });
  const fresh = !existsSync(dbPath);
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  if (fresh) ensureSchema(db);

  return {
    async select<T>(sql: string, params: unknown[]): Promise<T[]> {
      const stmt = db.prepare(translate(sql));
      return stmt.all(...(params as never[])) as T[];
    },
    async execute(sql: string, params: unknown[]): Promise<void> {
      const stmt = db.prepare(translate(sql));
      stmt.run(...(params as never[]));
    },
  };
}

/** Apply the canonical migration if the DB was just created. */
function ensureSchema(db: DatabaseSync): void {
  const migrationUrl = new URL(
    "../src-tauri/migrations/0001_init.sql",
    import.meta.url,
  );
  const sql = readFileSync(fileURLToPath(migrationUrl), "utf8");
  db.exec(sql);
}
