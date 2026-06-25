-- Student attachments: resumes, transcripts, email attachments, etc.
-- The physical file is copied into the app data dir; rel_path is relative to it.
CREATE TABLE IF NOT EXISTS student_files (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL,
  name        TEXT NOT NULL,                       -- display filename
  kind        TEXT NOT NULL DEFAULT 'attachment',  -- resume | transcript | attachment | other
  rel_path    TEXT NOT NULL,                       -- path under AppData
  size        INTEGER,                             -- bytes
  note        TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  sync_status TEXT NOT NULL DEFAULT 'dirty',
  owner_id    TEXT NOT NULL DEFAULT 'xqiao'
);
CREATE INDEX IF NOT EXISTS idx_student_files_student ON student_files(student_id);
