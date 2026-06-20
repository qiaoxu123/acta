/**
 * Pluggable SQL driver.
 *
 * The same repositories run in two processes:
 *   1. the Tauri webview (default driver → `tauri-plugin-sql`)
 *   2. the headless Node service / MCP bridge (driver → `node:sqlite`)
 *
 * Callers always use `select`/`execute`; the active driver is swapped with
 * `setDriver()` at process start (the Node service does this). The default
 * Tauri driver is loaded lazily via dynamic import so this module is safe to
 * import in Node, where `@tauri-apps/plugin-sql` does not exist.
 */
export interface SqlDriver {
  select<T>(sql: string, params: unknown[]): Promise<T[]>;
  execute(sql: string, params: unknown[]): Promise<void>;
}

let driver: SqlDriver | null = null;

/** Override the active driver. Call once at startup (Node service / tests). */
export function setDriver(d: SqlDriver): void {
  driver = d;
}

async function createTauriDriver(): Promise<SqlDriver> {
  const { default: Database } = await import("@tauri-apps/plugin-sql");
  const db = await Database.load("sqlite:acta.db");
  return {
    select: (sql, params) => db.select(sql, params),
    execute: async (sql, params) => {
      await db.execute(sql, params);
    },
  };
}

async function getDriver(): Promise<SqlDriver> {
  if (!driver) driver = await createTauriDriver();
  return driver;
}

export async function select<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await getDriver()).select<T>(sql, params);
}

/** Run a write statement. Prefer the helpers in `mutate.ts` so sync bookkeeping
 *  stays correct. */
export async function execute(
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  await (await getDriver()).execute(sql, params);
}
