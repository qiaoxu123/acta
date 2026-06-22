import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type Spark, type SyncFields } from "../types";
import { nowIso } from "../../lib/dates";
import { createIdea } from "./ideas";

const LIVE = "deleted_at IS NULL";

export async function listSparks(scope: ListScope = "active"): Promise<Spark[]> {
  return select<Spark>(
    `SELECT * FROM sparks WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY created_at DESC`,
  );
}

export type SparkInput = Omit<Spark, keyof SyncFields | "archived_at" | "promoted_to">;

export function createSpark(data: SparkInput): Promise<string> {
  return insert("sparks", data);
}

export function updateSpark(id: string, patch: Partial<SparkInput>): Promise<void> {
  return update("sparks", id, patch);
}

export function archiveSpark(id: string, archived: boolean): Promise<void> {
  return update("sparks", id, { archived_at: archived ? nowIso() : null });
}

export function deleteSpark(id: string): Promise<void> {
  return softDelete("sparks", id);
}

/** Turn a spark into a tracked idea (status: spark), then archive it off the
 *  board. Returns the new idea's id so the caller can open it. */
export async function promoteSpark(s: Spark): Promise<string> {
  const ideaId = await createIdea({
    title: s.body.length > 80 ? s.body.slice(0, 80) + "…" : s.body,
    summary: s.body,
    category: "idea",
    status: "spark",
    priority: 0,
    repo_url: "",
    tags: s.tags ?? "",
    notes: "",
  });
  await update("sparks", s.id, { promoted_to: ideaId, archived_at: nowIso() });
  return ideaId;
}
