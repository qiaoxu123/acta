import { select } from "../client";

/** A unified, dated item shown on the dashboard timeline. */
export interface AgendaItem {
  id: string; // unique per (source row + field)
  date: string; // ISO UTC instant
  timezone: string; // display zone (editions carry their own; others UTC/local)
  kind: "deadline" | "review" | "revision" | "event" | "task";
  label: string; // what this date is (e.g. "Submission deadline")
  title: string; // the venue/paper/manuscript title
  href: string; // in-app route to the source
}

interface EditionRow {
  id: string;
  venue_id: string;
  name: string;
  short_name: string | null;
  timezone: string;
  abstract_deadline: string | null;
  submission_deadline: string | null;
  rebuttal_end: string | null;
  notification_date: string | null;
  camera_ready: string | null;
  event_start: string | null;
}

interface DueRow {
  id: string;
  parent_id: string;
  title: string;
  date: string | null;
}

interface TaskRow {
  id: string;
  title: string;
  due_date: string | null;
}

/**
 * Collect every future-or-recent dated item across the app for the dashboard.
 * Pulls from venue editions, review rounds, paper revisions, and tasks, then
 * flattens edition rows (which carry several dates) into individual entries.
 */
export async function getAgenda(): Promise<AgendaItem[]> {
  const [editions, reviews, revisions, tasks] = await Promise.all([
    select<EditionRow>(
      `SELECT e.id, e.venue_id, v.name, v.short_name, e.timezone,
              e.abstract_deadline, e.submission_deadline, e.rebuttal_end,
              e.notification_date, e.camera_ready, e.event_start
         FROM venue_editions e JOIN venues v ON v.id = e.venue_id
        WHERE e.deleted_at IS NULL AND v.deleted_at IS NULL`,
    ),
    select<DueRow>(
      `SELECT r.id, r.manuscript_id AS parent_id, m.title, r.due_date AS date
         FROM review_rounds r JOIN reviewed_manuscripts m ON m.id = r.manuscript_id
        WHERE r.deleted_at IS NULL AND m.deleted_at IS NULL AND r.due_date IS NOT NULL`,
    ),
    select<DueRow>(
      `SELECT s.id, s.paper_id AS parent_id, p.title, s.revision_deadline AS date
         FROM paper_submissions s JOIN papers p ON p.id = s.paper_id
        WHERE s.deleted_at IS NULL AND p.deleted_at IS NULL
          AND s.revision_deadline IS NOT NULL`,
    ),
    select<TaskRow>(
      `SELECT id, title, due_date FROM tasks
        WHERE deleted_at IS NULL AND done = 0 AND due_date IS NOT NULL`,
    ),
  ]);

  const items: AgendaItem[] = [];

  for (const e of editions) {
    const name = e.short_name || e.name;
    const push = (date: string | null, label: string) => {
      if (date)
        items.push({
          id: `${e.id}:${label}`,
          date,
          timezone: e.timezone,
          kind: label === "Conference" ? "event" : "deadline",
          label,
          title: name,
          href: `/venues/${e.venue_id}`,
        });
    };
    push(e.abstract_deadline, "Abstract deadline");
    push(e.submission_deadline, "Submission deadline");
    push(e.rebuttal_end, "Rebuttal due");
    push(e.notification_date, "Notification");
    push(e.camera_ready, "Camera-ready");
    push(e.event_start, "Conference");
  }

  for (const r of reviews)
    items.push({
      id: r.id,
      date: r.date!,
      timezone: "local",
      kind: "review",
      label: "Review due",
      title: r.title,
      href: `/reviews/${r.parent_id}`,
    });

  for (const s of revisions)
    items.push({
      id: s.id,
      date: s.date!,
      timezone: "local",
      kind: "revision",
      label: "Revision due",
      title: s.title,
      href: `/papers/${s.parent_id}`,
    });

  for (const t of tasks)
    items.push({
      id: t.id,
      date: t.due_date!,
      timezone: "local",
      kind: "task",
      label: "Task",
      title: t.title,
      href: `/`,
    });

  return items.sort((a, b) => a.date.localeCompare(b.date));
}
