import { v4 as uuidv4 } from "uuid";

/** Generate a fresh UUID v4 — used as the primary key for every row so rows
 *  are globally unique and safe to merge across devices during cloud sync. */
export function newId(): string {
  return uuidv4();
}
