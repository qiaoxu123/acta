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
const SCOPE = {
  enum: ["active", "archived", "all"],
  description: "Which records to return (default 'all')",
};

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
    recommendation: { enum: ["accept", "minor", "major", "reject_resubmit", "reject"] },
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

  // --- Venues (list) ---------------------------------------------------------
  {
    name: "list_venues",
    mutates: false,
    description: "List journals/conferences. Optionally filter by kind.",
    inputSchema: {
      type: "object",
      properties: { kind: { enum: ["journal", "conference"] }, scope: SCOPE },
    },
  },

  // --- Patents ---------------------------------------------------------------
  {
    name: "list_patents",
    mutates: false,
    description: "List the user's patents with their current status.",
    inputSchema: { type: "object", properties: { scope: SCOPE } },
  },
  {
    name: "upsert_patent",
    mutates: true,
    description:
      "Create or update one of the user's patents. Matches by id, then " +
      "app_number, then title. Use for a filing receipt or status-change notice.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: {
            id: { type: "string" },
            app_number: { type: "string" },
            title: { type: "string" },
          },
        },
        patent: {
          type: "object",
          properties: {
            title: { type: "string" },
            type: { enum: ["invention", "utility", "design"] },
            app_number: { type: "string", description: "Application number" },
            app_date: DATE,
            pub_number: { type: "string", description: "Publication number" },
            grant_number: { type: "string" },
            status: { enum: ["drafting", "filed", "substantive", "granted", "rejected"] },
            inventors: { type: "string", description: "Comma-separated" },
            my_role: { enum: ["first", "co"], description: "first inventor or co-inventor" },
            notes: { type: "string" },
          },
          required: ["title"],
        },
      },
      required: ["patent"],
    },
  },

  // --- Projects --------------------------------------------------------------
  {
    name: "list_projects",
    mutates: false,
    description: "List research projects (grants/contracts). Optionally filter by category.",
    inputSchema: {
      type: "object",
      properties: { category: { enum: ["vertical", "horizontal"] }, scope: SCOPE },
    },
  },
  {
    name: "upsert_project",
    mutates: true,
    description:
      "Create or update a project (vertical grant / horizontal contract). " +
      "Matches by id, then number, then name. Use for a call-for-proposals or award notice.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: {
            id: { type: "string" },
            number: { type: "string" },
            name: { type: "string" },
          },
        },
        project: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { enum: ["vertical", "horizontal"], description: "纵向 | 横向" },
            level: {
              type: "string",
              description: "national|provincial|ministerial|horizontal|other",
            },
            program: { type: "string", description: "e.g. NSFC面上 / NSFC青年 / 省自然" },
            agency: { type: "string", description: "Funding agency / client" },
            number: { type: "string", description: "Project number" },
            pi_role: { enum: ["lead", "participant"], description: "主持 | 参与" },
            amount: { type: "string", description: "Budget, free text incl. unit" },
            status: { enum: ["planning", "applying", "active", "completed", "rejected"] },
            timezone: { type: "string", description: "Zone for apply_deadline (default 'local')" },
            apply_deadline: DEADLINE,
            start_date: DATE,
            end_date: DATE,
            notes: { type: "string" },
          },
          required: ["name"],
        },
      },
      required: ["project"],
    },
  },

  // --- Ideas (research/engineering tracker) ----------------------------------
  {
    name: "list_ideas",
    mutates: false,
    description: "List research ideas / engineering-progress items with status.",
    inputSchema: { type: "object", properties: { scope: SCOPE } },
  },
  {
    name: "upsert_idea",
    mutates: true,
    description:
      "Create or update a research idea, and optionally append discussion/progress " +
      "log entries (the git-graph timeline). Matches by id, then title.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" } },
        },
        idea: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string", description: "One-line description" },
            category: {
              enum: ["idea", "experiment", "course", "hardware", "simulation", "paper", "infra"],
            },
            status: {
              enum: [
                "spark", "exploring", "validated", "building",
                "done", "paused", "dropped", "merged",
              ],
            },
            priority: { type: "integer", enum: [0, 1], description: "0 normal, 1 high" },
            repo_url: { type: "string", description: "Primary GitHub / code link" },
            tags: { type: "string", description: "Comma-separated" },
            notes: { type: "string" },
          },
          required: ["title"],
        },
        logs: {
          type: "array",
          description: "Append-only timeline entries to add.",
          items: {
            type: "object",
            properties: {
              kind: { enum: ["note", "finding", "decision", "progress"] },
              body: { type: "string" },
            },
            required: ["body"],
          },
        },
      },
      required: ["idea"],
    },
  },
  {
    name: "add_idea_log",
    mutates: true,
    description:
      "Append one entry to an idea's discussion/progress timeline " +
      "(note = thought, finding = research result, decision = a call made, progress = build step).",
    inputSchema: {
      type: "object",
      properties: {
        idea_id: { type: "string" },
        kind: { enum: ["note", "finding", "decision", "progress"] },
        body: { type: "string" },
      },
      required: ["idea_id", "body"],
    },
  },

  // --- Sparks (brainstorm inbox) ---------------------------------------------
  {
    name: "list_sparks",
    mutates: false,
    description: "List captured sparks (灵感) and observed problems (问题发现).",
    inputSchema: { type: "object", properties: { scope: SCOPE } },
  },
  {
    name: "upsert_spark",
    mutates: true,
    description:
      "Capture a flash of inspiration or an observed problem, or update one by id.",
    inputSchema: {
      type: "object",
      properties: {
        match: { type: "object", properties: { id: { type: "string" } } },
        spark: {
          type: "object",
          properties: {
            kind: { enum: ["spark", "problem"], description: "灵感 | 问题发现" },
            body: { type: "string" },
            tags: { type: "string", description: "Comma-separated" },
          },
          required: ["body"],
        },
      },
      required: ["spark"],
    },
  },
  {
    name: "promote_spark",
    mutates: true,
    description:
      "Turn a spark into a tracked idea (status: spark) and archive it off the board. " +
      "Returns the new idea's id.",
    inputSchema: {
      type: "object",
      properties: { spark_id: { type: "string" } },
      required: ["spark_id"],
    },
  },

  // --- Notes -----------------------------------------------------------------
  {
    name: "list_notes",
    mutates: false,
    description: "List notes (tagged Markdown knowledge / reflections).",
    inputSchema: { type: "object", properties: { scope: SCOPE } },
  },
  {
    name: "upsert_note",
    mutates: true,
    description: "Create or update a note. Matches by id, then title.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" } },
        },
        note: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string", description: "Markdown" },
            tags: { type: "string", description: "Comma-separated" },
            folder: { type: "string", description: 'Folder path, e.g. "读论文/VLN"' },
            pinned: { type: "integer", enum: [0, 1] },
          },
          required: ["title"],
        },
      },
      required: ["note"],
    },
  },

  // --- Reports ---------------------------------------------------------------
  {
    name: "list_reports",
    mutates: false,
    description: "List periodic work-progress reports.",
    inputSchema: { type: "object", properties: { scope: SCOPE } },
  },
  {
    name: "upsert_report",
    mutates: true,
    description: "Create or update a work report. Matches by id, then title.",
    inputSchema: {
      type: "object",
      properties: {
        match: {
          type: "object",
          properties: { id: { type: "string" }, title: { type: "string" } },
        },
        report: {
          type: "object",
          properties: {
            title: { type: "string" },
            period_start: DATE,
            period_end: DATE,
            body: { type: "string", description: "Sectioned Markdown" },
          },
          required: ["title"],
        },
      },
      required: ["report"],
    },
  },

  // --- Tasks (list) ----------------------------------------------------------
  {
    name: "list_tasks",
    mutates: false,
    description: "List to-dos. By default only open (not done) ones.",
    inputSchema: {
      type: "object",
      properties: { include_done: { type: "boolean", description: "default false" } },
    },
  },
];

export const ACTION_NAMES = ACTIONS.map((a) => a.name);

export function getAction(name: string): ActionDef | undefined {
  return ACTIONS.find((a) => a.name === name);
}
