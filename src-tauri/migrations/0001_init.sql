-- Acta initial schema (v1)
--
-- Conventions
--   * Every row has a UUID text primary key (`id`).
--   * Timestamps are ISO-8601 UTC strings (e.g. "2026-09-01T11:59:00Z").
--   * Soft deletes via `deleted_at` (tombstone) so future cloud sync can
--     propagate deletions. NULL = live row.
--   * `sync_status` is 'dirty' for locally-changed rows, 'clean' once synced.
--     With no backend yet everything stays 'dirty'; it is forward-looking.
--   * Deadlines are stored as absolute UTC instants. The `timezone` column on
--     editions records the zone the user entered (e.g. 'AoE') for display/edit.

PRAGMA foreign_keys = ON;

------------------------------------------------------------------------------
-- Venues: journals & conferences
------------------------------------------------------------------------------
CREATE TABLE venues (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  short_name  TEXT,
  kind        TEXT NOT NULL DEFAULT 'conference', -- 'journal' | 'conference'
  rank        TEXT,                               -- e.g. 'CCF-A', 'JCR Q1', '中科院一区'
  publisher   TEXT,
  url         TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty'
);

------------------------------------------------------------------------------
-- Venue editions: one call-for-papers cycle / year, carries the deadlines
------------------------------------------------------------------------------
CREATE TABLE venue_editions (
  id                  TEXT PRIMARY KEY,
  venue_id            TEXT NOT NULL REFERENCES venues(id),
  year                INTEGER,
  cycle_label         TEXT,           -- e.g. '2026 Spring', 'Vol. 12'
  location            TEXT,
  timezone            TEXT NOT NULL DEFAULT 'AoE', -- zone deadlines were entered in
  abstract_deadline   TEXT,           -- UTC instant
  submission_deadline TEXT,           -- UTC instant
  rebuttal_start      TEXT,
  rebuttal_end        TEXT,
  notification_date   TEXT,
  camera_ready        TEXT,
  event_start         TEXT,           -- date-only ok
  event_end           TEXT,
  url                 TEXT,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL,
  deleted_at          TEXT,
  sync_status         TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX idx_editions_venue ON venue_editions(venue_id);
CREATE INDEX idx_editions_submission ON venue_editions(submission_deadline);

------------------------------------------------------------------------------
-- Reviewing: manuscripts I reviewed + per-round records
------------------------------------------------------------------------------
CREATE TABLE reviewed_manuscripts (
  id            TEXT PRIMARY KEY,
  venue_id      TEXT REFERENCES venues(id),     -- optional link
  venue_name    TEXT,                            -- snapshot if no linked venue
  title         TEXT NOT NULL,
  manuscript_id TEXT,                            -- the submission/paper id
  role          TEXT NOT NULL DEFAULT 'reviewer', -- 'reviewer'|'meta'|'pc'
  status        TEXT NOT NULL DEFAULT 'invited',  -- invited|accepted|in_progress|submitted|declined|done
  notes         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT,
  sync_status   TEXT NOT NULL DEFAULT 'dirty'
);

CREATE TABLE review_rounds (
  id             TEXT PRIMARY KEY,
  manuscript_id  TEXT NOT NULL REFERENCES reviewed_manuscripts(id),
  round          INTEGER NOT NULL DEFAULT 1,
  invited_date   TEXT,
  due_date       TEXT,           -- UTC instant
  submitted_date TEXT,
  recommendation TEXT,           -- accept|minor|major|reject
  confidence     INTEGER,        -- 1..5
  comments       TEXT,           -- the opinions I gave (markdown)
  private_notes  TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT,
  sync_status    TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX idx_rounds_manuscript ON review_rounds(manuscript_id);

------------------------------------------------------------------------------
-- My papers + submission/revision rounds
------------------------------------------------------------------------------
CREATE TABLE papers (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  target_venue_id TEXT REFERENCES venues(id),
  target_venue    TEXT,                  -- snapshot label
  status          TEXT NOT NULL DEFAULT 'idea',
  -- idea|drafting|internal_review|submitted|under_review|
  -- major_revision|minor_revision|accepted|rejected|camera_ready|published
  authors         TEXT,                  -- JSON array of names
  abstract        TEXT,
  overleaf_url    TEXT,
  repo_url        TEXT,
  started_date    TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'dirty'
);

CREATE TABLE paper_submissions (
  id                TEXT PRIMARY KEY,
  paper_id          TEXT NOT NULL REFERENCES papers(id),
  round             INTEGER NOT NULL DEFAULT 1,
  venue_name        TEXT,
  submitted_date    TEXT,
  decision          TEXT,        -- major|minor|accept|reject|desk_reject|pending
  decision_date     TEXT,
  revision_deadline TEXT,        -- UTC instant
  reviewer_summary  TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT,
  sync_status       TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX idx_submissions_paper ON paper_submissions(paper_id);

------------------------------------------------------------------------------
-- Generic tasks: polymorphic, drive the dashboard reminders
------------------------------------------------------------------------------
CREATE TABLE tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  linked_type TEXT,             -- 'paper'|'review'|'edition'|null
  linked_id   TEXT,
  due_date    TEXT,
  done        INTEGER NOT NULL DEFAULT 0,
  priority    INTEGER NOT NULL DEFAULT 1, -- 0 low,1 normal,2 high
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX idx_tasks_due ON tasks(due_date);
