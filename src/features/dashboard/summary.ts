/**
 * Builds the dashboard overview: one summary per module (count + status pills +
 * the few most relevant rows) plus a cross-module "focus" bar. Reuses the same
 * list repositories and agenda the rest of the app uses, so the numbers always
 * match the lists.
 */
import { select } from "@/db/client";
import { listManuscripts, reviewDueMap } from "@/db/repositories/reviews";
import { listPapers } from "@/db/repositories/papers";
import { listVenues } from "@/db/repositories/venues";
import { listPatents } from "@/db/repositories/patents";
import { listProjects, projectDueMap } from "@/db/repositories/projects";
import { listIdeas } from "@/db/repositories/ideas";
import { listSparks } from "@/db/repositories/sparks";
import { listNotes } from "@/db/repositories/notes";
import { listFunding } from "@/db/repositories/funding";
import { listStudents } from "@/db/repositories/students";
import { getAgenda } from "@/db/repositories/dashboard";
import type { TFn } from "@/lib/i18n";

export type Tone = "neutral" | "accent" | "warn" | "ok" | "urgent";
export interface Pill {
  label: string;
  n: number;
  tone: Tone;
}
export interface CardRow {
  id: string;
  title: string;
  sub: string;
  href: string;
  date?: string | null; // ISO instant → countdown badge
}
export interface DashCard {
  count: number;
  pills: Pill[];
  rows: CardRow[];
}
export interface FocusNext {
  title: string;
  label: string; // agenda label key suffix
  date: string;
  tz: string;
  href: string;
}
export interface DashData {
  focus: { next: FocusNext | null; stats: { key: string; n: number; href: string }[] };
  cards: Record<string, DashCard>;
}

const ROW_CAP = 8; // page slices further by density

const REVIEW_ACTIVE = ["invited", "accepted", "in_progress"];
const PAPER_SUBMITTED = ["submitted", "under_review"];
const PAPER_REVISION = ["major_revision", "minor_revision"];
const PAPER_DRAFT = ["idea", "drafting", "internal_review"];
const PAPER_RANK = [...PAPER_REVISION, ...PAPER_SUBMITTED, ...PAPER_DRAFT];

const cmpDue = (a: string | null, b: string | null, fa: string, fb: string) => {
  if (a && b) return a.localeCompare(b);
  if (a) return -1;
  if (b) return 1;
  return fb.localeCompare(fa); // fall back to most-recently-updated
};

const pill = (label: string, n: number, tone: Tone): Pill => ({ label, n, tone });

export async function loadDashboard(t: TFn): Promise<DashData> {
  const now = new Date().toISOString();
  const soon = new Date(Date.now() + 14 * 864e5).toISOString();

  const [manuscripts, dueMap, papers, venues, patents, projects, projDue, ideas, sparks, notes, funds, students, agenda, taskRows] =
    await Promise.all([
      listManuscripts("active"),
      reviewDueMap(),
      listPapers("active"),
      listVenues("active"),
      listPatents("active"),
      listProjects("active"),
      projectDueMap(),
      listIdeas("active"),
      listSparks("active"),
      listNotes("active"),
      listFunding("active"),
      listStudents("active"),
      getAgenda(),
      select<{ n: number }>(
        `SELECT COUNT(*) AS n FROM tasks WHERE deleted_at IS NULL AND done = 0`,
      ),
    ]);

  const cards: Record<string, DashCard> = {};

  // --- Reviews ---------------------------------------------------------------
  {
    const active = manuscripts.filter((m) => REVIEW_ACTIVE.includes(m.status));
    const rows = [...active]
      .sort((a, b) => cmpDue(dueMap[a.id] ?? null, dueMap[b.id] ?? null, a.updated_at, b.updated_at))
      .slice(0, ROW_CAP)
      .map((m) => ({
        id: m.id,
        title: m.title,
        sub: m.venue_name || t(`mstatus.${m.status}`),
        href: `/reviews/item/${m.id}`,
        date: dueMap[m.id] ?? null,
      }));
    const n = (s: string) => manuscripts.filter((m) => m.status === s).length;
    cards.reviews = {
      count: manuscripts.length,
      rows,
      pills: [
        pill(t("dash.g.pending"), n("invited"), "neutral"),
        pill(t("dash.g.active"), n("accepted") + n("in_progress"), "warn"),
        pill(t("dash.g.done"), n("submitted"), "ok"),
      ].filter((p) => p.n > 0),
    };
  }

  // --- Papers ----------------------------------------------------------------
  {
    const revDate: Record<string, string> = {};
    for (const a of agenda)
      if (a.kind === "revision") {
        const id = a.href.split("/item/")[1];
        if (id && (!revDate[id] || a.date < revDate[id])) revDate[id] = a.date;
      }
    const rank = (s: string) => {
      const i = PAPER_RANK.indexOf(s);
      return i === -1 ? 99 : i;
    };
    const rows = [...papers]
      .sort(
        (a, b) =>
          rank(a.status) - rank(b.status) ||
          cmpDue(revDate[a.id] ?? null, revDate[b.id] ?? null, a.updated_at, b.updated_at),
      )
      .slice(0, ROW_CAP)
      .map((p) => ({
        id: p.id,
        title: p.title,
        sub: [t(`pstatus.${p.status}`), p.target_venue].filter(Boolean).join(" · "),
        href: `/papers/item/${p.id}`,
        date: revDate[p.id] ?? null,
      }));
    const cnt = (g: string[]) => papers.filter((p) => g.includes(p.status)).length;
    cards.papers = {
      count: papers.length,
      rows,
      pills: [
        pill(t("dash.g.reviewing"), cnt(PAPER_SUBMITTED), "accent"),
        pill(t("dash.g.revising"), cnt(PAPER_REVISION), "warn"),
        pill(t("dash.g.drafting"), cnt(PAPER_DRAFT), "neutral"),
      ].filter((p) => p.n > 0),
    };
  }

  // --- Journals / Conferences (nearest calls-for-papers) ---------------------
  for (const [key, route] of [
    ["journals", "journals"],
    ["conferences", "conferences"],
  ] as const) {
    const upcoming = agenda.filter((a) => a.href.startsWith(`/${route}/`) && a.date >= now);
    const rows = upcoming.slice(0, ROW_CAP).map((a) => ({
      id: a.id,
      title: a.title,
      sub: t(`agenda.${a.label}`),
      href: a.href,
      date: a.date,
    }));
    cards[key] = {
      count: venues.filter((v) => v.kind === (key === "journals" ? "journal" : "conference")).length,
      rows,
      pills: [pill(t("dash.g.upcoming"), upcoming.length, "accent")].filter((p) => p.n > 0),
    };
  }

  // --- Projects (vertical + horizontal combined) -----------------------------
  {
    const STATUS_RANK = ["active", "applying", "planning", "completed", "rejected"];
    const rows = [...projects]
      .sort(
        (a, b) =>
          STATUS_RANK.indexOf(a.status) - STATUS_RANK.indexOf(b.status) ||
          cmpDue(projDue[a.id] ?? null, projDue[b.id] ?? null, a.updated_at, b.updated_at),
      )
      .slice(0, ROW_CAP)
      .map((p) => ({
        id: p.id,
        title: p.name,
        sub: [t(`pstatus2.${p.status}`), p.agency].filter(Boolean).join(" · "),
        href: `/projects/${p.category}/item/${p.id}`,
        date: projDue[p.id] ?? null,
      }));
    const n = (s: string) => projects.filter((p) => p.status === s).length;
    cards.projects = {
      count: projects.length,
      rows,
      pills: [
        pill(t("dash.g.active"), n("active"), "ok"),
        pill(t("dash.g.applying"), n("applying"), "warn"),
        pill(t("dash.g.planning"), n("planning"), "neutral"),
      ].filter((p) => p.n > 0),
    };
  }

  // --- Ideas -----------------------------------------------------------------
  {
    const RANK = ["building", "exploring", "validated", "spark", "paused", "done", "merged", "dropped"];
    const rows = [...ideas]
      .sort(
        (a, b) =>
          RANK.indexOf(a.status) - RANK.indexOf(b.status) ||
          b.priority - a.priority ||
          b.updated_at.localeCompare(a.updated_at),
      )
      .slice(0, ROW_CAP)
      .map((x) => ({
        id: x.id,
        title: x.title,
        sub: [t(`istatus.${x.status}`), t(`icat.${x.category}`)].join(" · "),
        href: `/ideas/item/${x.id}`,
        date: null,
      }));
    const n = (s: string) => ideas.filter((x) => x.status === s).length;
    cards.ideas = {
      count: ideas.length,
      rows,
      pills: [
        pill(t("dash.g.building"), n("building"), "warn"),
        pill(t("dash.g.exploring"), n("exploring"), "accent"),
        pill(t("dash.g.done"), n("validated"), "ok"),
      ].filter((p) => p.n > 0),
    };
  }

  // --- Sparks ----------------------------------------------------------------
  {
    const rows = sparks.slice(0, ROW_CAP).map((s) => ({
      id: s.id,
      title: s.body,
      sub: t(`skind.${s.kind}`),
      href: "/sparks",
      date: null,
    }));
    cards.sparks = { count: sparks.length, rows, pills: [] };
  }

  // --- Notes -----------------------------------------------------------------
  {
    const rows = notes.slice(0, ROW_CAP).map((n) => ({
      id: n.id,
      title: n.title,
      sub: (n.tags ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => `#${x}`)
        .join(" "),
      href: `/notes/${n.id}`,
      date: null,
    }));
    cards.notes = { count: notes.length, rows, pills: [] };
  }

  // --- Patents ---------------------------------------------------------------
  {
    const rows = [...patents]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, ROW_CAP)
      .map((p) => ({
        id: p.id,
        title: p.title,
        sub: [t(`pstat.${p.status}`), p.app_number].filter(Boolean).join(" · "),
        href: `/patents/item/${p.id}`,
        date: null,
      }));
    const n = (g: string[]) => patents.filter((p) => g.includes(p.status)).length;
    cards.patents = {
      count: patents.length,
      rows,
      pills: [
        pill(t("dash.g.drafting"), n(["drafting"]), "neutral"),
        pill(t("dash.g.reviewing"), n(["filed", "substantive"]), "accent"),
        pill(t("dash.g.done"), n(["granted"]), "ok"),
      ].filter((p) => p.n > 0),
    };
  }

  // --- Funding ---------------------------------------------------------------
  {
    const rows = funds.slice(0, ROW_CAP).map((f) => ({
      id: f.id,
      title: f.title,
      sub: [`¥${((f.total_amount ?? 0) - (f.spent ?? 0)).toLocaleString()}`, f.source].filter(Boolean).join(" · "),
      href: `/funding/${f.id}`,
      date: null,
    }));
    const n = (g: string[]) => funds.filter((f) => g.includes(f.status)).length;
    cards.funding = {
      count: funds.length,
      rows,
      pills: [
        pill(t("dash.g.active"), n(["active"]), "ok"),
        pill(t("dash.g.done"), n(["completed", "closed"]), "neutral"),
      ].filter((p) => p.n > 0),
    };
  }

  // --- Students --------------------------------------------------------------
  {
    const rows = [...students]
      .sort((a, b) => (b.enrollment_year ?? "").localeCompare(a.enrollment_year ?? ""))
      .slice(0, ROW_CAP)
      .map((s) => ({
        id: s.id,
        title: s.name,
        sub: [t(`stu.level.${s.level}`), s.direction].filter(Boolean).join(" · "),
        href: `/students/${s.id}`,
        date: null,
      }));
    const n = (g: string[]) => students.filter((s) => g.includes(s.status)).length;
    cards.students = {
      count: students.length,
      rows,
      pills: [
        pill(t("dash.g.applying"), n(["applying"]), "warn"),
        pill(t("dash.g.active"), n(["active"]), "ok"),
      ].filter((p) => p.n > 0),
    };
  }

  // --- Focus bar -------------------------------------------------------------
  const next = agenda.find((a) => a.date >= now) ?? null;
  const focus = {
    next: next
      ? { title: next.title, label: next.label, date: next.date, tz: next.timezone, href: next.href }
      : null,
    stats: [
      {
        key: "reviews",
        n: manuscripts.filter((m) => REVIEW_ACTIVE.includes(m.status)).length,
        href: "/reviews",
      },
      {
        key: "papers",
        n: papers.filter((p) => [...PAPER_SUBMITTED, ...PAPER_REVISION].includes(p.status)).length,
        href: "/papers",
      },
      { key: "tasks", n: taskRows[0]?.n ?? 0, href: "/" },
      {
        key: "soon",
        n: agenda.filter((a) => a.date >= now && a.date <= soon).length,
        href: "/",
      },
    ],
  };

  return { focus, cards };
}
