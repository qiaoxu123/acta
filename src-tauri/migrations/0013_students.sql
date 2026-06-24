-- Students: track advisees — exam applicants, master's/PhD students.
CREATE TABLE IF NOT EXISTS students (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  level           TEXT NOT NULL DEFAULT 'master', -- bachelor | master | phd
  status          TEXT NOT NULL DEFAULT 'active', -- applying | active | graduated | transferred
  email           TEXT,
  phone           TEXT,
  direction       TEXT,                           -- research direction
  co_advisor      TEXT,                           -- co-advisor name
  enrollment_year TEXT,                           -- YYYY
  graduation_year TEXT,                           -- YYYY (expected)
  exam_date       TEXT,                           -- YYYY-MM-DD (考研初试, for bachelor→master applicants)
  interview_date  TEXT,                           -- YYYY-MM-DD (复试/保研面试)
  notes           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  deleted_at      TEXT,
  archived_at     TEXT,
  sync_status     TEXT NOT NULL DEFAULT 'dirty'
);
