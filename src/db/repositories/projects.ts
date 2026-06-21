import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type Project, type SyncFields } from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

export async function listProjects(scope: ListScope = "active"): Promise<Project[]> {
  return select<Project>(
    `SELECT * FROM projects WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY updated_at DESC`,
  );
}

export async function getProject(id: string): Promise<Project | null> {
  const rows = await select<Project>(`SELECT * FROM projects WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type ProjectInput = Omit<Project, keyof SyncFields | "archived_at">;

export function createProject(data: ProjectInput): Promise<string> {
  return insert("projects", data);
}
export function updateProject(id: string, patch: Partial<ProjectInput>): Promise<void> {
  return update("projects", id, patch);
}
export function deleteProject(id: string): Promise<void> {
  return softDelete("projects", id);
}
export function archiveProject(id: string, archived: boolean): Promise<void> {
  return update("projects", id, { archived_at: archived ? nowIso() : null });
}

/** Application deadline per project (for the list's Due column). */
export async function projectDueMap(): Promise<Record<string, string>> {
  const rows = await select<{ id: string; due: string | null }>(
    `SELECT id, apply_deadline AS due FROM projects
       WHERE ${LIVE} AND apply_deadline IS NOT NULL`,
  );
  const map: Record<string, string> = {};
  for (const r of rows) if (r.due) map[r.id] = r.due;
  return map;
}
