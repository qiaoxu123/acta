-- Notes: durable long-form knowledge / 心得体会, organized by tags (not a
-- lifecycle tracker like ideas). Markdown body.
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  body        TEXT,                          -- Markdown
  tags        TEXT,                          -- comma-separated
  pinned      INTEGER NOT NULL DEFAULT 0,    -- 0/1, pinned notes sort first
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  archived_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty'
);
