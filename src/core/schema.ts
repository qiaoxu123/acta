/**
 * The AI-/automation-facing contract.
 *
 * One registry of named actions, each with a JSON Schema for its input. This is
 * the single source of truth reused by every transport:
 *   - HTTP server: discovery (`GET /actions`) + request validation
 *   - Claude ingest: the schemas become tool-use definitions
 *   - MCP server: the schemas become MCP tool input schemas
 *
 * Keep descriptions explicit — an LLM reads them to fill the fields from an
 * email. Deadline fields are LOCAL wall-clock date-times ("YYYY-MM-DDTHH:mm")
 * interpreted in the record's `timezone` (default AoE for venues); the service
 * converts them to absolute UTC for storage.
 */

export type JsonSchema = Record<string, unknown>;

export interface ActionDef {
  name: string;
  description: string;
  /** True if the action writes to the database. */
  mutates: boolean;
  inputSchema: JsonSchema;
}

const DEADLINE = {
  type: "string",
  description: 'Local wall-clock date-time "YYYY-MM-DDTHH:mm" in the record timezone',
};
const DATE = { type: "string", description: 'Date "YYYY-MM-DD"' };

const EDITION: JsonSchema = {
  type: "object",
  properties: {
    year: { type: "integer" },
    cycle_label: { type: "string", description: "e.g. '2026', 'Spring', 'Vol. 12'" },
    location: { type: "string" },
    timezone: {
      type: "string",
      description: "Zone the deadlines are stated in: 'AoE' (default), 'UTC', or an IANA id",
    },
    abstract_deadline: DEADLINE,
    submission_deadline: DEADLINE,
    rebuttal_start: DEADLINE,
    rebuttal_end: DEADLINE,
    notification_date: DEADLINE,
    camera_ready: DEADLINE,
    event_start: DATE,
    event_end: DATE,
    url: { type: "string" },
    notes: { type: "string" },
  },
};

const ROUND: JsonSchema = {
  type: "object",
  properties: {
    round: { type: "integer", description: "Review round number (1, 2, …)" },
    timezone: { type: "string", description: "Zone for due/submitted (default 'local')" },
    due_date: DEADLINE,
    submitted_date: DEADLINE,
    recommendation: { enum: ["accept", "minor", "major", "reject"] },
    confidence: { type: "integer", minimum: 1, maximum: 5 },
    comments: { type: "string", description: "The review comments you gave (markdown)" },
    private_notes: { type: "string" },
  },
  required: ["round"],
};

const SUBMISSION: JsonSchema = {
  type: "object",
  properties: {
    round: { type: "integer" },
    venue_name: { type: "string" },
    submitted_date: DATE,
    decision: { enum: ["pending", "minor", "major", "accept", "reject", "desk_reject"] },
    decision_date: DATE,
    timezone: { type: "string", description: "Zone for revision_deadline (default 'local')" },
    revision_deadline: DEADLINE,
    reviewer_summary: { type: "string" },
  },
  required: ["round"],
};

export const ACTIONS: ActionDef[] = [
  {
    name: "upsert_venue",
    mutates: true,
    description:
      "Create or update a journal/conference and its calls-for-papers (editions). " +
      "Matches an existing venue by id, then short_name, then name. Use for a " +
      "'call for papers' or 'deadline extended' email.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: {
            id: { type: "string" },
            short_name: { type: "string" },
            name: { type: "string" },
          },
        },
        venue: {
          type: "object",
          properties: {
            name: { type: "string" },
            short_name: { type: "string" },
            kind: { enum: ["journal", "conference"] },
            rank: { type: "string", description: "e.g. 'CCF-A', 'JCR Q1', '中科院一区'" },
            publisher: { type: "string" },
            url: { type: "string" },
            notes: { type: "string" },
          },
          required: ["name"],
        },
        editions: { type: "array", items: EDITION },
      },
      required: ["venue"],
    },
  },
  {
    name: "upsert_review",
    mutates: true,
    description:
      "Create or update a manuscript you are reviewing plus its per-round records. " +
      "Matches by id, then manuscript_id, then title. Use for a review-invitation " +
      "or reminder email.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: {
            id: { type: "string" },
            manuscript_id: { type: "string" },
            title: { type: "string" },
          },
        },
        manuscript: {
          type: "object",
          properties: {
            title: { type: "string" },
            venue_name: { type: "string" },
            manuscript_id: { type: "string" },
            role: { enum: ["reviewer", "meta", "pc"] },
            status: {
              enum: ["invited", "accepted", "in_progress", "submitted", "declined", "done"],
            },
            notes: { type: "string" },
          },
          required: ["title"],
        },
        rounds: { type: "array", items: ROUND },
      },
      required: ["manuscript"],
    },
  },
  {
    name: "upsert_paper",
    mutates: true,
    description:
      "Create or update one of the user's own papers plus its submission/revision " +
      "rounds. Matches by id, then title. Use for a decision email " +
      "(accept/reject/revision) or a status change.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" } },
        },
        paper: {
          type: "object",
          properties: {
            title: { type: "string" },
            target_venue: { type: "string" },
            status: {
              enum: [
                "idea", "drafting", "internal_review", "submitted", "under_review",
                "major_revision", "minor_revision", "accepted", "rejected",
                "camera_ready", "published",
              ],
            },
            authors: { type: "string", description: "Comma-separated" },
            abstract: { type: "string" },
            overleaf_url: { type: "string" },
            repo_url: { type: "string" },
            started_date: DATE,
            notes: { type: "string" },
          },
          required: ["title"],
        },
        submissions: { type: "array", items: SUBMISSION },
      },
      required: ["paper"],
    },
  },
  {
    name: "add_task",
    mutates: true,
    description: "Add a to-do with an optional due date, optionally linked to a record.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        due_date: DEADLINE,
        timezone: { type: "string", description: "default 'local'" },
        linked_type: { enum: ["paper", "review", "edition"] },
        linked_id: { type: "string" },
        priority: { type: "integer", enum: [0, 1, 2] },
      },
      required: ["title"],
    },
  },
  {
    name: "get_agenda",
    mutates: false,
    description: "Return every dated item (deadlines, reviews, revisions, tasks) sorted by date.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "find_venue",
    mutates: false,
    description: "Search venues by name/short_name/rank/publisher.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "list_papers",
    mutates: false,
    description: "List the user's papers with their current status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_reviews",
    mutates: false,
    description: "List reviewed manuscripts with status.",
    inputSchema: { type: "object", properties: {} },
  },
];

export const ACTION_NAMES = ACTIONS.map((a) => a.name);

export function getAction(name: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.name === name);
}
