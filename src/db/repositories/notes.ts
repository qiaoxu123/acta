import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type Note, type SyncFields } from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

export async function listNotes(scope: ListScope = "active"): Promise<Note[]> {
  return select<Note>(
    `SELECT * FROM notes WHERE ${LIVE} ${scopeWhere(scope)}
       ORDER BY pinned DESC, updated_at DESC`,
  );
}

export async function getNote(id: string): Promise<Note | null> {
  const rows = await select<Note>(`SELECT * FROM notes WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type NoteInput = Omit<Note, keyof SyncFields | "archived_at">;

export function createNote(data: NoteInput): Promise<string> {
  return insert("notes", data);
}
export function updateNote(id: string, patch: Partial<NoteInput>): Promise<void> {
  return update("notes", id, patch);
}
export function deleteNote(id: string): Promise<void> {
  return softDelete("notes", id);
}
export function archiveNote(id: string, archived: boolean): Promise<void> {
  return update("notes", id, { archived_at: archived ? nowIso() : null });
}
