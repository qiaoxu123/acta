-- v3: paper authorship role + patents + projects (纵向/横向).
-- Idempotent CREATEs so the same file is safe under both migrators; the ALTER
-- is applied once by the app's sqlx migrator (node-only DBs never run v3).

ALTER TABLE papers ADD COLUMN my_role TEXT; -- first | corresponding | advised | coauthor

CREATE TABLE IF NOT EXISTS patents (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'invention', -- invention|utility|design
  app_number   TEXT,
  app_date     TEXT,
  pub_number   TEXT,
  grant_number TEXT,
  status       TEXT NOT NULL DEFAULT 'drafting',  -- drafting|filed|substantive|granted|rejected
  inventors    TEXT,
  my_role      TEXT,                              -- first | co
  notes        TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  deleted_at   TEXT,
  archived_at  TEXT,
  sync_status  TEXT NOT NULL DEFAULT 'dirty'
);

CREATE TABLE IF NOT EXISTS projects (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'vertical', -- vertical(纵向) | horizontal(横向)
  level          TEXT,                             -- national|provincial|ministerial|horizontal|other
  program        TEXT,                             -- e.g. NSFC面上 / NSFC青年 / 省自然
  agency         TEXT,                             -- 资助机构 / 委托方
  number         TEXT,                             -- 项目编号
  pi_role        TEXT,                             -- lead(主持) | participant(参与)
  amount         TEXT,                             -- 经费(文本，含单位)
  status         TEXT NOT NULL DEFAULT 'planning', -- planning|applying|active|completed|rejected
  apply_deadline TEXT,                             -- 申请截止(UTC instant)
  start_date     TEXT,
  end_date       TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT,
  archived_at    TEXT,
  sync_status    TEXT NOT NULL DEFAULT 'dirty'
);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
