import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type Patent, type SyncFields } from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

export async function listPatents(scope: ListScope = "active"): Promise<Patent[]> {
  return select<Patent>(
    `SELECT * FROM patents WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY updated_at DESC`,
  );
}

export type PatentInput = Omit<Patent, keyof SyncFields | "archived_at">;

export function createPatent(data: PatentInput): Promise<string> {
  return insert("patents", data);
}
export function updatePatent(id: string, patch: Partial<PatentInput>): Promise<void> {
  return update("patents", id, patch);
}
export function deletePatent(id: string): Promise<void> {
  return softDelete("patents", id);
}
export function archivePatent(id: string, archived: boolean): Promise<void> {
  return update("patents", id, { archived_at: archived ? nowIso() : null });
}
