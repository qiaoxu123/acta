/** Row shapes mirror the SQLite schema in
 *  src-tauri/migrations/0001_init.sql. Date fields are ISO-8601 UTC strings. */

export interface SyncFields {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status: string;
}

/** Archive scope for list queries. */
export type ListScope = "active" | "archived" | "all";

/** SQL fragment selecting rows by archive scope (assumes an `archived_at`
 *  column). Combine with the live (`deleted_at IS NULL`) filter. */
export function scopeWhere(scope: ListScope): string {
  if (scope === "archived") return "AND archived_at IS NOT NULL";
  if (scope === "all") return "";
  return "AND archived_at IS NULL";
}

export type VenueKind = "journal" | "conference";

export interface Venue extends SyncFields {
  name: string;
  short_name: string | null;
  kind: VenueKind;
  rank: string | null;
  publisher: string | null;
  url: string | null;
  notes: string | null;
  archived_at: string | null;
}

export interface VenueEdition extends SyncFields {
  venue_id: string;
  year: number | null;
  cycle_label: string | null;
  location: string | null;
  timezone: string;
  abstract_deadline: string | null;
  submission_deadline: string | null;
  rebuttal_start: string | null;
  rebuttal_end: string | null;
  notification_date: string | null;
  camera_ready: string | null;
  event_start: string | null;
  event_end: string | null;
  url: string | null;
  notes: string | null;
}

export type ReviewerRole = "reviewer" | "meta" | "pc";
export type ManuscriptStatus =
  | "invited"
  | "accepted"
  | "in_progress"
  | "submitted"
  | "declined"
  | "done";

export interface ReviewedManuscript extends SyncFields {
  venue_id: string | null;
  venue_name: string | null;
  title: string;
  manuscript_id: string | null;
  role: ReviewerRole;
  status: ManuscriptStatus;
  review_url: string | null;
  notes: string | null;
  archived_at: string | null;
}

export type Recommendation = "accept" | "minor" | "major" | "reject";

export interface ReviewRound extends SyncFields {
  manuscript_id: string;
  round: number;
  invited_date: string | null;
  due_date: string | null;
  submitted_date: string | null;
  recommendation: Recommendation | null;
  confidence: number | null;
  comments: string | null;
  private_notes: string | null;
}

export type PaperStatus =
  | "idea"
  | "drafting"
  | "internal_review"
  | "submitted"
  | "under_review"
  | "major_revision"
  | "minor_revision"
  | "accepted"
  | "rejected"
  | "camera_ready"
  | "published";

/** The user's own role on a paper — drives sidebar classification & stats. */
export type PaperRole = "first" | "corresponding" | "advised" | "coauthor";

export interface Paper extends SyncFields {
  title: string;
  target_venue_id: string | null;
  target_venue: string | null;
  status: PaperStatus;
  my_role: PaperRole | null;
  authors: string | null; // JSON array
  abstract: string | null;
  overleaf_url: string | null;
  repo_url: string | null;
  started_date: string | null;
  notes: string | null;
  archived_at: string | null;
}

export type PatentType = "invention" | "utility" | "design";
export type PatentStatus =
  | "drafting"
  | "filed"
  | "substantive"
  | "granted"
  | "rejected";

export interface Patent extends SyncFields {
  title: string;
  type: PatentType;
  app_number: string | null;
  app_date: string | null;
  pub_number: string | null;
  grant_number: string | null;
  status: PatentStatus;
  inventors: string | null;
  my_role: string | null; // first | co
  notes: string | null;
  archived_at: string | null;
}

export type ProjectCategory = "vertical" | "horizontal";
export type ProjectStatus =
  | "planning"
  | "applying"
  | "active"
  | "completed"
  | "rejected";

export interface Project extends SyncFields {
  name: string;
  category: ProjectCategory;
  level: string | null; // national|provincial|ministerial|horizontal|other
  program: string | null;
  agency: string | null;
  number: string | null;
  pi_role: string | null; // lead | participant
  amount: string | null;
  status: ProjectStatus;
  apply_deadline: string | null;
  start_date: string | null;
  end_date: string | null;
  notes: string | null;
  archived_at: string | null;
}

export type Decision =
  | "major"
  | "minor"
  | "accept"
  | "reject"
  | "desk_reject"
  | "pending";

export interface PaperSubmission extends SyncFields {
  paper_id: string;
  round: number;
  venue_name: string | null;
  submitted_date: string | null;
  decision: Decision | null;
  decision_date: string | null;
  revision_deadline: string | null;
  reviewer_summary: string | null;
}

export interface Task extends SyncFields {
  title: string;
  linked_type: string | null;
  linked_id: string | null;
  due_date: string | null;
  done: number;
  priority: number;
}

/** The set of tables that participate in JSON export/import & future sync. */
export const ALL_TABLES = [
  "venues",
  "venue_editions",
  "reviewed_manuscripts",
  "review_rounds",
  "papers",
  "paper_submissions",
  "patents",
  "projects",
  "tasks",
] as const;
export type TableName = (typeof ALL_TABLES)[number];
