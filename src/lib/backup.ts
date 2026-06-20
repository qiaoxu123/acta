import { select } from "../db/client";
import { insertRaw, truncate } from "../db/mutate";
import { ALL_TABLES } from "../db/types";

export interface Backup {
  app: "acta";
  version: 1;
  exported_at: string;
  tables: Record<string, Record<string, unknown>[]>;
}

/** Serialize the entire database (including tombstones) to a portable object.
 *  This is the manual-backup path that stands in for cloud sync today. */
export async function exportAll(): Promise<Backup> {
  const tables: Backup["tables"] = {};
  for (const t of ALL_TABLES) {
    tables[t] = await select<Record<string, unknown>>(`SELECT * FROM ${t}`);
  }
  return {
    app: "acta",
    version: 1,
    exported_at: new Date().toISOString(),
    tables,
  };
}

/** Replace all data with the contents of a backup. Destructive by design —
 *  callers must confirm with the user first. */
export async function importAll(backup: Backup): Promise<void> {
  if (backup.app !== "acta") {
    throw new Error("Not an Acta backup file.");
  }
  // Delete children before parents is unnecessary here (no cascade), but we
  // truncate in reverse declared order for tidiness.
  for (const t of [...ALL_TABLES].reverse()) {
    await truncate(t);
  }
  for (const t of ALL_TABLES) {
    await insertRaw(t, backup.tables[t] ?? []);
  }
}
