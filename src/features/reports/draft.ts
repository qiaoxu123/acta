import type { TFn } from "@/lib/i18n";
import type { WeekAgg, WeekBounds } from "@/db/repositories/reports";

const ymd = (d: Date) => {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

/** ISO-8601 week number (Mon-based). */
function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3); // nearest Thursday
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  return 1 + Math.round((t.getTime() - firstThu.getTime()) / (7 * 864e5));
}

export interface Week extends WeekBounds {
  label: string; // e.g. "W25"
  title: string; // default report title
}

/** The Mon–Sun week containing `now` (local), with bounds for aggregation. */
export function currentWeek(now: Date = new Date()): Week {
  const monday = new Date(now);
  const day = (monday.getDay() + 6) % 7; // Mon = 0
  monday.setDate(monday.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const nextMon = new Date(monday);
  nextMon.setDate(monday.getDate() + 7);
  const label = `W${isoWeek(monday)}`;
  return {
    startDate: ymd(monday),
    endDate: ymd(sunday),
    startISO: monday.toISOString(),
    endISO: nextMon.toISOString(),
    label,
    title: `${label} · ${ymd(monday).slice(5)}~${ymd(sunday).slice(5)}`,
  };
}

/** Compose the sectioned Markdown body, with aggregated bullets pre-filled. */
export function composeBody(t: TFn, agg: WeekAgg): string {
  const sect = (titleKey: string, bullets: string[]) =>
    `## ${t(titleKey)}\n${bullets.length ? bullets.join("\n") : "- "}\n`;
  return [
    sect("report.s.done", agg.done),
    sect("report.s.doing", agg.doing),
    sect("report.s.plan", []),
    sect("report.s.blockers", []),
  ].join("\n");
}
