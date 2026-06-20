import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import {
  scopeWhere,
  type ListScope,
  type ReviewedManuscript,
  type ReviewRound,
  type SyncFields,
} from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

export async function listManuscripts(
  scope: ListScope = "active",
): Promise<ReviewedManuscript[]> {
  return select<ReviewedManuscript>(
    `SELECT * FROM reviewed_manuscripts WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY updated_at DESC`,
  );
}

export function archiveManuscript(id: string, archived: boolean): Promise<void> {
  return update("reviewed_manuscripts", id, {
    archived_at: archived ? nowIso() : null,
  });
}

/** Earliest unsubmitted review-round due date per manuscript (for the list). */
export async function reviewDueMap(): Promise<Record<string, string>> {
  const rows = await select<{ manuscript_id: string; due: string }>(
    `SELECT manuscript_id, MIN(due_date) AS due FROM review_rounds
       WHERE deleted_at IS NULL AND submitted_date IS NULL AND due_date IS NOT NULL
       GROUP BY manuscript_id`,
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.manuscript_id] = r.due;
  return map;
}

export async function getManuscript(
  id: string,
): Promise<ReviewedManuscript | null> {
  const rows = await select<ReviewedManuscript>(
    `SELECT * FROM reviewed_manuscripts WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export type ManuscriptInput = Omit<
  ReviewedManuscript,
  keyof SyncFields | "archived_at"
>;

export function createManuscript(data: ManuscriptInput): Promise<string> {
  return insert("reviewed_manuscripts", data);
}

export function updateManuscript(
  id: string,
  patch: Partial<ManuscriptInput>,
): Promise<void> {
  return update("reviewed_manuscripts", id, patch);
}

export async function deleteManuscript(id: string): Promise<void> {
  const rounds = await listRounds(id);
  await Promise.all(rounds.map((r) => softDelete("review_rounds", r.id)));
  await softDelete("reviewed_manuscripts", id);
}

// ---- Rounds -----------------------------------------------------------------

export async function listRounds(manuscriptId: string): Promise<ReviewRound[]> {
  return select<ReviewRound>(
    `SELECT * FROM review_rounds WHERE manuscript_id = $1 AND ${LIVE} ORDER BY round ASC`,
    [manuscriptId],
  );
}

export type RoundInput = Omit<ReviewRound, keyof SyncFields>;

export function createRound(data: RoundInput): Promise<string> {
  return insert("review_rounds", data);
}

export function updateRound(
  id: string,
  patch: Partial<RoundInput>,
): Promise<void> {
  return update("review_rounds", id, patch);
}

export function deleteRound(id: string): Promise<void> {
  return softDelete("review_rounds", id);
}
