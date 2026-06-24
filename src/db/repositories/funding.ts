import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type SyncFields } from "../types";

export interface Funding extends SyncFields {
  title: string;
  source: string | null;
  number: string | null;
  total_amount: number | null;
  spent: number;
  balance: number | null;
  category: string; // "grant" | "contract" | "other"
  status: string; // "active" | "completed" | "closed"
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  archived_at: string | null;
}

const LIVE = "deleted_at IS NULL";

export async function listFunding(scope: ListScope = "active"): Promise<Funding[]> {
  return select<Funding>(
    `SELECT *, (total_amount - spent) AS balance FROM funding WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY updated_at DESC`,
  );
}

export async function getFunding(id: string): Promise<Funding | null> {
  const rows = await select<Funding>(`SELECT *, (total_amount - spent) AS balance FROM funding WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type FundingInput = Omit<Funding, keyof SyncFields | "archived_at" | "balance">;

export function createFunding(data: FundingInput): Promise<string> {
  return insert("funding", data);
}
export function updateFunding(id: string, patch: Partial<FundingInput>): Promise<void> {
  return update("funding", id, patch);
}
export function deleteFunding(id: string): Promise<void> {
  return softDelete("funding", id);
}
