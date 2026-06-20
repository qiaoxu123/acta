import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import type { Venue, VenueEdition } from "../types";

const LIVE = "deleted_at IS NULL";

// ---- Venues -----------------------------------------------------------------

export async function listVenues(): Promise<Venue[]> {
  return select<Venue>(
    `SELECT * FROM venues WHERE ${LIVE} ORDER BY name COLLATE NOCASE`,
  );
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
