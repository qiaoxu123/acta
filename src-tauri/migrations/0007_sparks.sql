-- v7: a low-friction "sparks" inbox for brainstorming — flashes of inspiration
-- and observed problems that may later seed a tracked idea. A spark can be
-- promoted into the ideas table (promoted_to), then archived out of the board.

CREATE TABLE IF NOT EXISTS sparks (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL DEFAULT 'spark',  -- spark(灵感) | problem(问题发现)
  body        TEXT NOT NULL,
  tags        TEXT,
  promoted_to TEXT,                            -- ideas.id once promoted
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  archived_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX IF NOT EXISTS idx_sparks_kind ON sparks(kind);
