/**
 * Action handlers + dispatcher — the transport-agnostic service layer.
 *
 * `applyAction(name, input)` is the one entry point every transport calls
 * (in-app buttons, HTTP server, MCP server, AI ingest). Handlers reuse the same
 * repositories the UI uses, so writes go through the single mutation gateway and
 * stay sync-ready. Upserts match on natural keys so repeated emails about the
 * same venue/paper/manuscript merge instead of duplicating.
 */
import {
  createEdition,
  createVenue,
  listEditions,
  listVenues,
  updateEdition,
  updateVenue,
} from "../db/repositories/venues";
import {
  createManuscript,
  createRound,
  listManuscripts,
  listRounds,
  updateManuscript,
  updateRound,
} from "../db/repositories/reviews";
import {
  createPaper,
  createSubmission,
  listPapers,
  listSubmissions,
  updatePaper,
  updateSubmission,
} from "../db/repositories/papers";
import { createPatent, listPatents, updatePatent } from "../db/repositories/patents";
import { createProject, listProjects, updateProject } from "../db/repositories/projects";
import {
  createIdea,
  createIdeaLog,
  getIdea,
  listIdeas,
  updateIdea,
} from "../db/repositories/ideas";
import { createSpark, listSparks, promoteSpark, updateSpark } from "../db/repositories/sparks";
import { createNote, listNotes, updateNote } from "../db/repositories/notes";
import { createFunding, listFunding, updateFunding } from "../db/repositories/funding";
import { createStudent, listStudents, updateStudent } from "../db/repositories/students";
import { getAgenda } from "../db/repositories/dashboard";
import { insert } from "../db/mutate";
import { select } from "../db/client";
import type { ListScope } from "../db/types";
import { localInputToUtcIso } from "../lib/dates";
import { getAction } from "./schema";

type Dict = Record<string, any>;

const ci = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Keep only defined keys so partial updates don't overwrite with undefined. */
function defined<T extends Dict>(obj: T): Partial<T> {
  const out: Dict = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}

const toUtc = (v: string | undefined | null, tz: string) =>
  v ? localInputToUtcIso(v, tz) : null;

// --- Venues ------------------------------------------------------------------

async function upsertVenue(input: Dict) {
  const { match = {}, venue, editions = [] } = input;
  const all = await listVenues("all");
  const existing =
    (match.id && all.find((v) => v.id === match.id)) ||
    (match.short_name && all.find((v) => ci(v.short_name, match.short_name))) ||
    (match.name && all.find((v) => ci(v.name, match.name))) ||
    all.find((v) => ci(v.short_name, venue.short_name)) ||
    all.find((v) => ci(v.name, venue.name)) ||
    null;

  let venueId: string;
  let mode: "created" | "updated";
  if (existing) {
    await updateVenue(existing.id, defined(venue));
    venueId = existing.id;
    mode = "updated";
  } else {
    venueId = await createVenue({ kind: "conference", ...defined(venue) } as any);
    mode = "created";
  }

  const existingEditions = await listEditions(venueId);
  const editionResults = [];
  for (const e of editions as Dict[]) {
    const tz = e.timezone || "AoE";
    const data = defined({
      venue_id: venueId,
      year: e.year ?? undefined,
      cycle_label: e.cycle_label ?? undefined,
      location: e.location ?? undefined,
      timezone: tz,
      abstract_deadline: toUtc(e.abstract_deadline, tz),
      submission_deadline: toUtc(e.submission_deadline, tz),
      rebuttal_start: toUtc(e.rebuttal_start, tz),
      rebuttal_end: toUtc(e.rebuttal_end, tz),
      notification_date: toUtc(e.notification_date, tz),
      camera_ready: toUtc(e.camera_ready, tz),
      event_start: e.event_start ?? undefined,
      event_end: e.event_end ?? undefined,
      url: e.url ?? undefined,
      notes: e.notes ?? undefined,
    });
    const match2 =
      (e.cycle_label && existingEditions.find((x) => ci(x.cycle_label, e.cycle_label))) ||
      (e.year != null && existingEditions.find((x) => x.year === e.year)) ||
      null;
    if (match2) {
      await updateEdition(match2.id, data as any);
      editionResults.push({ id: match2.id, mode: "updated" });
    } else {
      const id = await createEdition(data as any);
      editionResults.push({ id, mode: "created" });
    }
  }
  return { ok: true, venue_id: venueId, mode, editions: editionResults };
}

// --- Reviews -----------------------------------------------------------------

async function upsertReview(input: Dict) {
  const { match = {}, manuscript, rounds = [] } = input;
  const all = await listManuscripts("all");
  const existing =
    (match.id && all.find((m) => m.id === match.id)) ||
    (match.manuscript_id && all.find((m) => ci(m.manuscript_id, match.manuscript_id))) ||
    (match.title && all.find((m) => ci(m.title, match.title))) ||
    all.find((m) => manuscript.manuscript_id && ci(m.manuscript_id, manuscript.manuscript_id)) ||
    all.find((m) => ci(m.title, manuscript.title)) ||
    null;

  let id: string;
  let mode: "created" | "updated";
  if (existing) {
    await updateManuscript(existing.id, defined(manuscript));
    id = existing.id;
    mode = "updated";
  } else {
    id = await createManuscript({
      role: "reviewer",
      status: "invited",
      ...defined(manuscript),
    } as any);
    mode = "created";
  }

  const existingRounds = await listRounds(id);
  const roundResults = [];
  for (const r of rounds as Dict[]) {
    const tz = r.timezone || "local";
    const data = defined({
      manuscript_id: id,
      round: r.round,
      due_date: toUtc(r.due_date, tz),
      submitted_date: toUtc(r.submitted_date, tz),
      recommendation: r.recommendation ?? undefined,
      confidence: r.confidence ?? undefined,
      comments: r.comments ?? undefined,
      private_notes: r.private_notes ?? undefined,
    });
    const found = existingRounds.find((x) => x.round === r.round);
    if (found) {
      await updateRound(found.id, data as any);
      roundResults.push({ id: found.id, round: r.round, mode: "updated" });
    } else {
      const rid = await createRound(data as any);
      roundResults.push({ id: rid, round: r.round, mode: "created" });
    }
  }
  return { ok: true, manuscript_id: id, mode, rounds: roundResults };
}

// --- Papers ------------------------------------------------------------------

async function upsertPaper(input: Dict) {
  const { match = {}, paper, submissions = [] } = input;
  const all = await listPapers("all");
  const existing =
    (match.id && all.find((p) => p.id === match.id)) ||
    (match.title && all.find((p) => ci(p.title, match.title))) ||
    all.find((p) => ci(p.title, paper.title)) ||
    null;

  let id: string;
  let mode: "created" | "updated";
  if (existing) {
    await updatePaper(existing.id, defined(paper));
    id = existing.id;
    mode = "updated";
  } else {
    id = await createPaper({ status: "idea", ...defined(paper) } as any);
    mode = "created";
  }

  const existingSubs = await listSubmissions(id);
  const subResults = [];
  for (const s of submissions as Dict[]) {
    const tz = s.timezone || "local";
    const data = defined({
      paper_id: id,
      round: s.round,
      venue_name: s.venue_name ?? undefined,
      submitted_date: s.submitted_date ?? undefined,
      decision: s.decision ?? undefined,
      decision_date: s.decision_date ?? undefined,
      revision_deadline: toUtc(s.revision_deadline, tz),
      reviewer_summary: s.reviewer_summary ?? undefined,
    });
    const found = existingSubs.find((x) => x.round === s.round);
    if (found) {
      await updateSubmission(found.id, data as any);
      subResults.push({ id: found.id, round: s.round, mode: "updated" });
    } else {
      const sid = await createSubmission(data as any);
      subResults.push({ id: sid, round: s.round, mode: "created" });
    }
  }
  return { ok: true, paper_id: id, mode, submissions: subResults };
}

async function addTask(input: Dict) {
  const tz = input.timezone || "local";
  const id = await insert(
    "tasks",
    defined({
      title: input.title,
      due_date: toUtc(input.due_date, tz),
      linked_type: input.linked_type ?? undefined,
      linked_id: input.linked_id ?? undefined,
      priority: input.priority ?? 1,
      done: 0,
    }),
  );
  return { ok: true, task_id: id };
}

// --- Patents -----------------------------------------------------------------

async function upsertPatent(input: Dict) {
  const { match = {}, patent } = input;
  const all = await listPatents("all");
  const existing =
    (match.id && all.find((p) => p.id === match.id)) ||
    (match.app_number && all.find((p) => ci(p.app_number, match.app_number))) ||
    (match.title && all.find((p) => ci(p.title, match.title))) ||
    (patent.app_number && all.find((p) => ci(p.app_number, patent.app_number))) ||
    all.find((p) => ci(p.title, patent.title)) ||
    null;

  if (existing) {
    await updatePatent(existing.id, defined(patent));
    return { ok: true, patent_id: existing.id, mode: "updated" };
  }
  const id = await createPatent(defined(patent) as any);
  return { ok: true, patent_id: id, mode: "created" };
}

// --- Projects ----------------------------------------------------------------

async function upsertProject(input: Dict) {
  const { match = {}, project } = input;
  const tz = project.timezone || "local";
  const data = defined({
    name: project.name,
    category: project.category ?? undefined,
    level: project.level ?? undefined,
    program: project.program ?? undefined,
    agency: project.agency ?? undefined,
    number: project.number ?? undefined,
    pi_role: project.pi_role ?? undefined,
    amount: project.amount ?? undefined,
    status: project.status ?? undefined,
    apply_deadline:
      project.apply_deadline !== undefined ? toUtc(project.apply_deadline, tz) : undefined,
    start_date: project.start_date ?? undefined,
    end_date: project.end_date ?? undefined,
    notes: project.notes ?? undefined,
  });
  const all = await listProjects("all");
  const existing =
    (match.id && all.find((p) => p.id === match.id)) ||
    (match.number && all.find((p) => ci(p.number, match.number))) ||
    (match.name && all.find((p) => ci(p.name, match.name))) ||
    (project.number && all.find((p) => ci(p.number, project.number))) ||
    all.find((p) => ci(p.name, project.name)) ||
    null;

  if (existing) {
    await updateProject(existing.id, data);
    return { ok: true, project_id: existing.id, mode: "updated" };
  }
  const id = await createProject(data as any);
  return { ok: true, project_id: id, mode: "created" };
}

// --- Ideas -------------------------------------------------------------------

async function upsertIdea(input: Dict) {
  const { match = {}, idea, logs = [] } = input;
  const all = await listIdeas("all");
  const existing =
    (match.id && all.find((i) => i.id === match.id)) ||
    (match.title && all.find((i) => ci(i.title, match.title))) ||
    all.find((i) => ci(i.title, idea.title)) ||
    null;

  let id: string;
  let mode: "created" | "updated";
  if (existing) {
    await updateIdea(existing.id, defined(idea));
    id = existing.id;
    mode = "updated";
  } else {
    id = await createIdea(defined(idea) as any);
    mode = "created";
  }

  const logResults = [];
  for (const l of logs as Dict[]) {
    const lid = await createIdeaLog({
      idea_id: id,
      kind: l.kind || "note",
      body: l.body,
    } as any);
    logResults.push({ id: lid });
  }
  return { ok: true, idea_id: id, mode, logs: logResults };
}

async function addIdeaLog(input: Dict) {
  const idea = await getIdea(input.idea_id);
  if (!idea) throw new Error(`No idea with id: ${input.idea_id}`);
  const id = await createIdeaLog({
    idea_id: input.idea_id,
    kind: input.kind || "note",
    body: input.body,
  } as any);
  return { ok: true, log_id: id, idea_id: input.idea_id };
}

// --- Sparks ------------------------------------------------------------------

async function upsertSpark(input: Dict) {
  const { match = {}, spark } = input;
  if (match.id) {
    const existing = (await listSparks("all")).find((s) => s.id === match.id);
    if (existing) {
      await updateSpark(existing.id, defined(spark));
      return { ok: true, spark_id: existing.id, mode: "updated" };
    }
  }
  const id = await createSpark(
    defined({ kind: spark.kind ?? undefined, body: spark.body, tags: spark.tags ?? undefined }) as any,
  );
  return { ok: true, spark_id: id, mode: "created" };
}

async function promoteSparkAction(input: Dict) {
  const s = (await listSparks("all")).find((x) => x.id === input.spark_id);
  if (!s) throw new Error(`No spark with id: ${input.spark_id}`);
  const ideaId = await promoteSpark(s);
  return { ok: true, idea_id: ideaId, spark_id: s.id };
}

// --- Notes -------------------------------------------------------------------

async function upsertNote(input: Dict) {
  const { match = {}, note } = input;
  const all = await listNotes("all");
  const existing =
    (match.id && all.find((n) => n.id === match.id)) ||
    (match.title && all.find((n) => ci(n.title, match.title))) ||
    all.find((n) => ci(n.title, note.title)) ||
    null;
  if (existing) {
    await updateNote(existing.id, defined(note));
    return { ok: true, note_id: existing.id, mode: "updated" };
  }
  const id = await createNote(defined({ ...note, pinned: note.pinned ?? 0 }) as any);
  return { ok: true, note_id: id, mode: "created" };
}

// --- Funding -----------------------------------------------------------------

async function upsertFunding(input: Dict) {
  const { match = {}, funding } = input;
  const all = await listFunding("all");
  const existing =
    (match.id && all.find((f) => f.id === match.id)) ||
    (match.title && all.find((f) => ci(f.title, match.title))) ||
    all.find((f) => ci(f.title, funding.title)) ||
    null;
  if (existing) {
    await updateFunding(existing.id, defined(funding));
    return { ok: true, funding_id: existing.id, mode: "updated" };
  }
  const id = await createFunding(defined({ ...funding, spent: funding.spent ?? 0 }) as any);
  return { ok: true, funding_id: id, mode: "created" };
}

// --- Students ----------------------------------------------------------------

async function upsertStudent(input: Dict) {
  const { match = {}, student } = input;
  const all = await listStudents("all");
  const existing =
    (match.id && all.find((s) => s.id === match.id)) ||
    (match.name && all.find((s) => ci(s.name, match.name))) ||
    all.find((s) => ci(s.name, student.name)) ||
    null;
  if (existing) {
    await updateStudent(existing.id, defined(student));
    return { ok: true, student_id: existing.id, mode: "updated" };
  }
  const id = await createStudent(defined(student) as any);
  return { ok: true, student_id: id, mode: "created" };
}

/** Validate that an input object has the action's top-level required keys. */
function checkRequired(name: string, input: Dict) {
  const def = getAction(name);
  const required = (def?.inputSchema as any)?.required as string[] | undefined;
  for (const key of required ?? []) {
    if (input[key] === undefined)
      throw new Error(`Action "${name}" missing required field: ${key}`);
  }
}

/** The single dispatch entry point for every transport. */
export async function applyAction(name: string, input: Dict = {}): Promise<any> {
  if (!getAction(name)) throw new Error(`Unknown action: ${name}`);
  checkRequired(name, input);
  switch (name) {
    case "upsert_venue":
      return upsertVenue(input);
    case "upsert_review":
      return upsertReview(input);
    case "upsert_paper":
      return upsertPaper(input);
    case "add_task":
      return addTask(input);
    case "get_agenda":
      return { ok: true, items: await getAgenda() };
    case "find_venue": {
      const q = String(input.query ?? "").toLowerCase();
      const items = (await listVenues("all")).filter((v) =>
        [v.name, v.short_name, v.rank, v.publisher]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q)),
      );
      return { ok: true, items };
    }
    case "list_papers":
      return { ok: true, items: await listPapers("all") };
    case "list_reviews":
      return { ok: true, items: await listManuscripts("all") };
    case "list_venues": {
      const scope = (input.scope as ListScope) || "all";
      let items = await listVenues(scope);
      if (input.kind) items = items.filter((v) => v.kind === input.kind);
      return { ok: true, items };
    }
    case "list_patents":
      return { ok: true, items: await listPatents((input.scope as ListScope) || "all") };
    case "upsert_patent":
      return upsertPatent(input);
    case "list_projects": {
      const scope = (input.scope as ListScope) || "all";
      let items = await listProjects(scope);
      if (input.category) items = items.filter((p) => p.category === input.category);
      return { ok: true, items };
    }
    case "upsert_project":
      return upsertProject(input);
    case "list_ideas":
      return { ok: true, items: await listIdeas((input.scope as ListScope) || "all") };
    case "upsert_idea":
      return upsertIdea(input);
    case "add_idea_log":
      return addIdeaLog(input);
    case "list_sparks":
      return { ok: true, items: await listSparks((input.scope as ListScope) || "all") };
    case "upsert_spark":
      return upsertSpark(input);
    case "promote_spark":
      return promoteSparkAction(input);
    case "list_notes":
      return { ok: true, items: await listNotes((input.scope as ListScope) || "all") };
    case "upsert_note":
      return upsertNote(input);
    case "list_funding":
      return { ok: true, items: await listFunding((input.scope as ListScope) || "all") };
    case "upsert_funding":
      return upsertFunding(input);
    case "list_students":
      return { ok: true, items: await listStudents((input.scope as ListScope) || "all") };
    case "upsert_student":
      return upsertStudent(input);
    case "list_tasks": {
      const cond = input.include_done ? "" : "AND (done IS NULL OR done = 0)";
      const items = await select(
        `SELECT * FROM tasks WHERE deleted_at IS NULL ${cond}
           ORDER BY due_date IS NULL, due_date ASC`,
      );
      return { ok: true, items };
    }
    default:
      throw new Error(`No handler for action: ${name}`);
  }
}
