import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import type { ReviewedManuscript, ReviewRound, SyncFields } from "../types";

const LIVE = "deleted_at IS NULL";

export async function listManuscripts(): Promise<ReviewedManuscript[]> {
  return select<ReviewedManuscript>(
    `SELECT * FROM reviewed_manuscripts WHERE ${LIVE} ORDER BY updated_at DESC`,
  );
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

export type ManuscriptInput = Omit<ReviewedManuscript, keyof SyncFields>;

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
