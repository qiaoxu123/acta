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
import { getAgenda } from "../db/repositories/dashboard";
import { insert } from "../db/mutate";
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
    default:
      throw new Error(`No handler for action: ${name}`);
  }
}
