import { select } from "../client";
import { insert, softDelete, update } from "../mutate";
import { scopeWhere, type ListScope, type Report, type SyncFields } from "../types";
import { nowIso } from "../../lib/dates";

const LIVE = "deleted_at IS NULL";

export async function listReports(scope: ListScope = "active"): Promise<Report[]> {
  return select<Report>(
    `SELECT * FROM reports WHERE ${LIVE} ${scopeWhere(scope)}
       ORDER BY period_start DESC, created_at DESC`,
  );
}

export async function getReport(id: string): Promise<Report | null> {
  const rows = await select<Report>(`SELECT * FROM reports WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type ReportInput = Omit<Report, keyof SyncFields | "archived_at">;

export function createReport(data: ReportInput): Promise<string> {
  return insert("reports", data);
}
export function updateReport(id: string, patch: Partial<ReportInput>): Promise<void> {
  return update("reports", id, patch);
}
export function deleteReport(id: string): Promise<void> {
  return softDelete("reports", id);
}
export function archiveReport(id: string, archived: boolean): Promise<void> {
  return update("reports", id, { archived_at: archived ? nowIso() : null });
}

// --- Weekly aggregation ------------------------------------------------------

export interface WeekBounds {
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string; // YYYY-MM-DD (inclusive)
  startISO: string; // instant (inclusive)
  endISO: string; // instant (exclusive)
}
export interface WeekAgg {
  done: string[]; // markdown bullets
  doing: string[];
}

const firstLine = (s: string) => (s || "").split("\n")[0].trim().slice(0, 120);

/**
 * Pull what actually happened in a date range from the rest of the app — idea
 * progress/findings, paper submissions/decisions, review submissions — so a
 * weekly report can be seeded instead of written from scratch.
 */
export async function aggregateWeek(b: WeekBounds): Promise<WeekAgg> {
  const [logs, subs, reviews] = await Promise.all([
    select<{ kind: string; title: string; body: string }>(
      `SELECT il.kind, i.title, il.body
         FROM idea_logs il JOIN ideas i ON i.id = il.idea_id
        WHERE il.deleted_at IS NULL AND i.deleted_at IS NULL
          AND il.created_at >= $1 AND il.created_at < $2
        ORDER BY il.created_at`,
      [b.startISO, b.endISO],
    ),
    select<{
      title: string;
      venue_name: string | null;
      submitted_date: string | null;
      decision: string | null;
      decision_date: string | null;
    }>(
      `SELECT p.title, s.venue_name, s.submitted_date, s.decision, s.decision_date
         FROM paper_submissions s JOIN papers p ON p.id = s.paper_id
        WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL
          AND ((s.submitted_date >= $1 AND s.submitted_date <= $2)
            OR (s.decision_date >= $1 AND s.decision_date <= $2))`,
      [b.startDate, b.endDate],
    ),
    select<{ title: string; round: number }>(
      `SELECT m.title, r.round
         FROM review_rounds r JOIN reviewed_manuscripts m ON m.id = r.manuscript_id
        WHERE r.deleted_at IS NULL AND m.deleted_at IS NULL
          AND r.submitted_date >= $1 AND r.submitted_date < $2`,
      [b.startISO, b.endISO],
    ),
  ]);

  const done: string[] = [];
  const doing: string[] = [];

  for (const l of logs) {
    const line = `- [${l.title}] ${firstLine(l.body)}`;
    if (l.kind === "progress") done.push(line);
    else if (l.kind === "finding") doing.push(line);
  }
  for (const s of subs) {
    if (s.submitted_date && s.submitted_date >= b.startDate && s.submitted_date <= b.endDate)
      done.push(`- 论文《${s.title}》投稿${s.venue_name ? " " + s.venue_name : ""}`);
    if (s.decision_date && s.decision_date >= b.startDate && s.decision_date <= b.endDate)
      done.push(`- 论文《${s.title}》收到决定：${s.decision ?? ""}`);
  }
  for (const r of reviews) done.push(`- 审稿《${r.title}》第 ${r.round} 轮已提交`);

  return { done, doing };
}
