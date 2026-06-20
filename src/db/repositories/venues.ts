import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type Venue, type VenueEdition } from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

// ---- Venues -----------------------------------------------------------------

export async function listVenues(scope: ListScope = "active"): Promise<Venue[]> {
  return select<Venue>(
    `SELECT * FROM venues WHERE ${LIVE} ${scopeWhere(scope)} ORDER BY name COLLATE NOCASE`,
  );
}

export function archiveVenue(id: string, archived: boolean): Promise<void> {
  return update("venues", id, { archived_at: archived ? nowIso() : null });
}

/** Next upcoming submission deadline per venue (for the list's column). */
export async function venueNextDeadlineMap(): Promise<Record<string, string>> {
  const rows = await select<{ venue_id: string; due: string }>(
    `SELECT venue_id, MIN(submission_deadline) AS due FROM venue_editions
       WHERE deleted_at IS NULL AND submission_deadline >= $1
       GROUP BY venue_id`,
    [nowIso()],
  );
  const map: Record<string, string> = {};
  for (const r of rows) map[r.venue_id] = r.due;
  return map;
}

export async function getVenue(id: string): Promise<Venue | null> {
  const rows = await select<Venue>(`SELECT * FROM venues WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type VenueInput = Pick<
  Venue,
  "name" | "short_name" | "kind" | "rank" | "publisher" | "url" | "notes"
>;

export function createVenue(data: VenueInput): Promise<string> {
  return insert("venues", data);
}

export function updateVenue(id: string, patch: Partial<VenueInput>): Promise<void> {
  return update("venues", id, patch);
}

/** Soft-delete a venue and tombstone its editions too. */
export async function deleteVenue(id: string): Promise<void> {
  const editions = await listEditions(id);
  await Promise.all(editions.map((e) => softDelete("venue_editions", e.id)));
  await softDelete("venues", id);
}

// ---- Editions ---------------------------------------------------------------

export async function listEditions(venueId: string): Promise<VenueEdition[]> {
  return select<VenueEdition>(
    `SELECT * FROM venue_editions
       WHERE venue_id = $1 AND ${LIVE}
       ORDER BY COALESCE(submission_deadline, abstract_deadline) DESC`,
    [venueId],
  );
}

export type EditionInput = Omit<
  VenueEdition,
  keyof import("../types").SyncFields
>;

export function createEdition(data: EditionInput): Promise<string> {
  return insert("venue_editions", data);
}

export function updateEdition(
  id: string,
  patch: Partial<EditionInput>,
): Promise<void> {
  return update("venue_editions", id, patch);
}

export function deleteEdition(id: string): Promise<void> {
  return softDelete("venue_editions", id);
}
