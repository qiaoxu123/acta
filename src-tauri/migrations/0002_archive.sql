-- v2: archiving ("收纳"). Top-level entities can be archived so the active
-- lists stay clean as records pile up over time; archived rows remain queryable
-- via the "archived" scope. NULL = active, an ISO timestamp = archived.
ALTER TABLE venues ADD COLUMN archived_at TEXT;
ALTER TABLE reviewed_manuscripts ADD COLUMN archived_at TEXT;
ALTER TABLE papers ADD COLUMN archived_at TEXT;
