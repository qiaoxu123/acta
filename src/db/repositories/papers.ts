import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import {
  scopeWhere,
  type ListScope,
  type Paper,
  type PaperSubmission,
  type SyncFields,
} from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

export async function listPapers(scope: ListScope = "active"): Promise<Paper[]> {
  return select<Paper>(
    `SELECT * FROM papers WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY updated_at DESC`,
  );
}

export function archivePaper(id: string, archived: boolean): Promise<void> {
  return update("papers", id, { archived_at: archived ? nowIso() : null });
}

/** Earliest revision deadline per paper (for the list's Due column). */
export async function paperDueMap(): Promise<Record<string, string>> {
  const rows = await select<{ paper_id: string; due: string }>(
    `SELECT paper_id, MIN(revision_deadline) AS due FROM paper_submissions
       WHERE deleted_at IS NULL AND revision_deadline IS NOT NULL
       GROUP BY paper_id`,
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.paper_id] = r.due;
  return map;
}

export async function getPaper(id: string): Promise<Paper | null> {
  const rows = await select<Paper>(`SELECT * FROM papers WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type PaperInput = Omit<Paper, keyof SyncFields | "archived_at">;

export function createPaper(data: PaperInput): Promise<string> {
  return insert("papers", data);
}

export function updatePaper(
  id: string,
  patch: Partial<PaperInput>,
): Promise<void> {
  return update("papers", id, patch);
}

export async function deletePaper(id: string): Promise<void> {
  const subs = await listSubmissions(id);
  await Promise.all(subs.map((s) => softDelete("paper_submissions", s.id)));
  await softDelete("papers", id);
}

// ---- Submission / revision rounds -------------------------------------------

export async function listSubmissions(
  paperId: string,
): Promise<PaperSubmission[]> {
  return select<PaperSubmission>(
    `SELECT * FROM paper_submissions WHERE paper_id = $1 AND ${LIVE} ORDER BY round ASC`,
    [paperId],
  );
}

export type SubmissionInput = Omit<PaperSubmission, keyof SyncFields>;

export function createSubmission(data: SubmissionInput): Promise<string> {
  return insert("paper_submissions", data);
}

export function updateSubmission(
  id: string,
  patch: Partial<SubmissionInput>,
): Promise<void> {
  return update("paper_submissions", id, patch);
}

export function deleteSubmission(id: string): Promise<void> {
  return softDelete("paper_submissions", id);
}
