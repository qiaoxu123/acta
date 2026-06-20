import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import type { Paper, PaperSubmission, SyncFields } from "../types";

const LIVE = "deleted_at IS NULL";

export async function listPapers(): Promise<Paper[]> {
  return select<Paper>(
    `SELECT * FROM papers WHERE ${LIVE} ORDER BY updated_at DESC`,
  );
}

export async function getPaper(id: string): Promise<Paper | null> {
  const rows = await select<Paper>(`SELECT * FROM papers WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type PaperInput = Omit<Paper, keyof SyncFields>;

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
