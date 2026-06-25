-- Collaborative groups: share specific items across owner_id isolation.
CREATE TABLE IF NOT EXISTS groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id  TEXT NOT NULL REFERENCES groups(id),
  user_id   TEXT NOT NULL,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (group_id, user_id)
);

-- Shared items: (group_id, table_name, item_id) junction — any item from any
-- table can be shared into a group, making it visible to all group members
-- regardless of owner_id. No per-table schema pollution needed.
CREATE TABLE IF NOT EXISTS shared_items (
  group_id   TEXT NOT NULL REFERENCES groups(id),
  table_name TEXT NOT NULL,
  item_id    TEXT NOT NULL,
  shared_by  TEXT NOT NULL,
  shared_at  TEXT NOT NULL,
  PRIMARY KEY (group_id, table_name, item_id)
);
