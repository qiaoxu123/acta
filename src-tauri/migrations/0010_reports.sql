-- Work reports: periodic (weekly) progress write-ups for group meetings.
-- Sectioned Markdown body; period is a date range.
CREATE TABLE IF NOT EXISTS reports (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  period_start TEXT,                          -- YYYY-MM-DD
  period_end   TEXT,                          -- YYYY-MM-DD
  body         TEXT,                          -- Markdown (sectioned)
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  archived_at  TEXT,
  sync_status  TEXT NOT NULL DEFAULT 'dirty'
);
