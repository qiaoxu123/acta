import { useState } from "react";
import type { ListScope } from "@/db/types";

/** Per-list view preferences (sort key, group key, archive scope), persisted. */
export interface ListView {
  sort: string;
  group: string;
  scope: ListScope;
}

export function useListView(
  storageKey: string,
  def: ListView,
): [ListView, (patch: Partial<ListView>) => void] {
  const [view, setView] = useState<ListView>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...def, ...JSON.parse(saved) } : def;
    } catch {
      return def;
    }
  });
  const update = (patch: Partial<ListView>) =>
    setView((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  return [view, update];
}

export interface Group {
  key: string;
  label: string;
  /** Lower comes first; lets status/type groups appear in a logical order. */
  order?: number;
}

export interface Section<T> extends Group {
  items: T[];
}

/**
 * Sort items by `sortKey`, then optionally split into ordered sections by
 * `groupKey`. Within each section the sort order is preserved.
 */
export function arrange<T>(
  items: T[],
  sortKey: string,
  groupKey: string,
  compare: (key: string, a: T, b: T) => number,
  groupOf: (key: string, item: T) => Group,
): Section<T>[] {
  const sorted = [...items].sort((a, b) => compare(sortKey, a, b));
  if (!groupKey || groupKey === "none")
    return [{ key: "", label: "", items: sorted }];

  const map = new Map<string, Section<T>>();
  for (const it of sorted) {
    const g = groupOf(groupKey, it);
    if (!map.has(g.key)) map.set(g.key, { ...g, items: [] });
    map.get(g.key)!.items.push(it);
  }
  return [...map.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Locale-aware string compare (ascending). */
export const cmpStr = (a?: string | null, b?: string | null) =>
  (a ?? "").localeCompare(b ?? "");
/** Descending compare for ISO timestamps (most recent first). */
export const cmpDesc = (a?: string | null, b?: string | null) =>
  (b ?? "").localeCompare(a ?? "");
/** Ascending compare for due dates; items without a date sort last. */
export const cmpDue = (a?: string | null, b?: string | null) => {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
};

/**
 * Deadline ordering by urgency: soonest *upcoming* first, then items with no
 * date, then *expired* ones at the very back (most-recently-expired first).
 */
export function cmpDueSoon(
  a?: string | null,
  b?: string | null,
  now: string = new Date().toISOString(),
): number {
  const cat = (d?: string | null) => (!d ? 1 : d >= now ? 0 : 2);
  const ca = cat(a),
    cb = cat(b);
  if (ca !== cb) return ca - cb;
  if (ca === 0) return (a as string).localeCompare(b as string); // upcoming: soonest first
  if (ca === 2) return (b as string).localeCompare(a as string); // expired: recent first
  return 0;
}
