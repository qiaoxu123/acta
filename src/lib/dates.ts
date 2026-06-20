import { fromZonedTime, toZonedTime, format as formatTz } from "date-fns-tz";
import { format, formatDistanceStrict, isValid, parseISO } from "date-fns";

/**
 * Academic deadlines are frequently expressed in "Anywhere on Earth" (AoE),
 * a fixed UTC-12 offset. The IANA equivalent is `Etc/GMT+12` (POSIX inverts
 * the sign, so +12 here means UTC-12). We store every deadline as an absolute
 * UTC instant and keep the entry zone only for display/editing.
 */
export const AOE_ZONE = "Etc/GMT+12";

export interface ZoneOption {
  value: string; // stored in venue_editions.timezone
  iana: string; // resolved IANA zone for conversion
  label: string;
}

export const ZONE_OPTIONS: ZoneOption[] = [
  { value: "AoE", iana: AOE_ZONE, label: "AoE (Anywhere on Earth, UTC-12)" },
  { value: "UTC", iana: "UTC", label: "UTC" },
  { value: "local", iana: localZone(), label: `Local (${localZone()})` },
  { value: "America/New_York", iana: "America/New_York", label: "US Eastern" },
  {
    value: "America/Los_Angeles",
    iana: "America/Los_Angeles",
    label: "US Pacific",
  },
  { value: "Europe/London", iana: "Europe/London", label: "London" },
  { value: "Asia/Shanghai", iana: "Asia/Shanghai", label: "China (UTC+8)" },
];

function localZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Resolve a stored timezone label to a concrete IANA zone. */
export function resolveZone(tz: string | null | undefined): string {
  if (!tz) return AOE_ZONE;
  const opt = ZONE_OPTIONS.find((z) => z.value === tz);
  return opt ? opt.iana : tz; // fall back to treating the label as an IANA id
}

/**
 * Convert a wall-clock value from a `<input type="datetime-local">`
 * (e.g. "2026-09-01T23:59"), interpreted in the given zone, to a UTC ISO
 * string for storage.
 */
export function localInputToUtcIso(
  datetimeLocal: string,
  tz: string,
): string | null {
  if (!datetimeLocal) return null;
  const utc = fromZonedTime(datetimeLocal, resolveZone(tz));
  return isValid(utc) ? utc.toISOString() : null;
}

/**
 * Inverse of {@link localInputToUtcIso}: produce a value suitable for a
 * datetime-local input, rendering the stored UTC instant in the given zone.
 */
export function utcIsoToLocalInput(
  iso: string | null | undefined,
  tz: string,
): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return formatTz(toZonedTime(d, resolveZone(tz)), "yyyy-MM-dd'T'HH:mm", {
    timeZone: resolveZone(tz),
  });
}

/** Human-friendly absolute display of a deadline in its entry zone. */
export function formatDeadline(
  iso: string | null | undefined,
  tz: string,
): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  if (!isValid(d)) return "—";
  const zone = resolveZone(tz);
  return formatTz(toZonedTime(d, zone), "yyyy-MM-dd HH:mm", { timeZone: zone }) +
    ` ${tz}`;
}

/** Short date-only display in local time. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd") : "—";
}

export type Urgency = "past" | "urgent" | "warn" | "ok";

export interface Countdown {
  label: string; // e.g. "in 3 days", "2 days ago"
  urgency: Urgency;
  days: number; // signed: negative = past
}

/** Compute a relative countdown from now to an ISO instant. */
export function countdown(
  iso: string | null | undefined,
  now: Date = new Date(),
): Countdown | null {
  if (!iso) return null;
  const target = parseISO(iso);
  if (!isValid(target)) return null;

  const ms = target.getTime() - now.getTime();
  const days = Math.floor(ms / 86_400_000);

  let urgency: Urgency;
  if (ms < 0) urgency = "past";
  else if (days <= 3) urgency = "urgent";
  else if (days <= 14) urgency = "warn";
  else urgency = "ok";

  const distance = formatDistanceStrict(target, now);
  const label = ms < 0 ? `${distance} ago` : `in ${distance}`;
  return { label, urgency, days };
}

/** Current instant as a UTC ISO string (used for created_at/updated_at). */
export function nowIso(): string {
  return new Date().toISOString();
}
