import { select } from "./client";

let cached: string | null | undefined; // undefined = not loaded

/** The current logged-in user's UUID. Cached per process start. */
export async function getCurrentUserId(): Promise<string | null> {
  if (cached !== undefined) return cached;
  try {
    const rows = await select<{ user_id: string }>(
      "SELECT user_id FROM sessions WHERE id='current'",
    );
    cached = rows[0]?.user_id ?? null;
  } catch {
    cached = null;
  }
  return cached;
}

/** The SQL fragment and params for owner-isolation. Includes group-shared items. */
export function ownerFilter(
  table: string,
  userId: string | null,
): { clause: string; params: string[] } {
  if (!userId) return { clause: "", params: [] };
  return {
    clause: `AND (${table}.owner_id = ? OR ${table}.id IN (SELECT item_id FROM shared_items WHERE table_name = '${table}' AND group_id IN (SELECT group_id FROM group_members WHERE user_id = ?)))`,
    params: [userId, userId],
  };
}
