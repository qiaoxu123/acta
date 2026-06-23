import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import {
  scopeWhere,
  type Idea,
  type IdeaLog,
  type ListScope,
  type SyncFields,
} from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

export async function listIdeas(scope: ListScope = "active"): Promise<Idea[]> {
  return select<Idea>(
    `SELECT * FROM ideas WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY updated_at DESC`,
  );
}

export async function getIdea(id: string): Promise<Idea | null> {
  const rows = await select<Idea>(`SELECT * FROM ideas WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type IdeaInput = Omit<Idea, keyof SyncFields | "archived_at">;

export function createIdea(data: IdeaInput): Promise<string> {
  return insert("ideas", data);
}

export function updateIdea(id: string, patch: Partial<IdeaInput>): Promise<void> {
  return update("ideas", id, patch);
}

export function archiveIdea(id: string, archived: boolean): Promise<void> {
  return update("ideas", id, { archived_at: archived ? nowIso() : null });
}

export async function deleteIdea(id: string): Promise<void> {
  const logs = await listIdeaLogs(id);
  await Promise.all(logs.map((l) => softDelete("idea_logs", l.id)));
  await softDelete("ideas", id);
}

// ---- Discussion / progress log ---------------------------------------------

export async function listIdeaLogs(ideaId: string): Promise<IdeaLog[]> {
  return select<IdeaLog>(
    `SELECT * FROM idea_logs WHERE idea_id = $1 AND ${LIVE} ORDER BY created_at ASC`,
    [ideaId],
  );
}

export type IdeaLogInput = Omit<IdeaLog, keyof SyncFields>;

export function createIdeaLog(data: IdeaLogInput): Promise<string> {
  return insert("idea_logs", data);
}

export function updateIdeaLog(id: string, patch: Partial<IdeaLogInput>): Promise<void> {
  return update("idea_logs", id, patch);
}

export function deleteIdeaLog(id: string): Promise<void> {
  return softDelete("idea_logs", id);
}
