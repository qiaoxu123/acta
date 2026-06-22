-- v6: research idea tracker. Capture ideas through their lifecycle
-- (spark → exploring → validated → building → done / paused / dropped / merged),
-- classify them, link a GitHub repo, and keep a discussion / progress log per
-- idea so the thinking (findings, decisions, test progress) is preserved.

CREATE TABLE IF NOT EXISTS ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  summary     TEXT,                            -- one-line description
  category    TEXT NOT NULL DEFAULT 'idea',    -- idea|experiment|course|hardware|simulation|paper|infra
  status      TEXT NOT NULL DEFAULT 'spark',   -- spark|exploring|validated|building|done|paused|dropped|merged
  priority    INTEGER NOT NULL DEFAULT 0,      -- 0 normal, 1 high
  repo_url    TEXT,                            -- primary GitHub / code link
  tags        TEXT,                            -- comma-separated
  notes       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  archived_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);

CREATE TABLE IF NOT EXISTS idea_logs (
  id          TEXT PRIMARY KEY,
  idea_id     TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'note',    -- note|finding|decision|progress
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX IF NOT EXISTS idx_idea_logs_idea ON idea_logs(idea_id);
