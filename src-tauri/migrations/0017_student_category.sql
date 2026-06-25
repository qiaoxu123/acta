-- Students: richer role taxonomy.
-- category = primary role bucket (incoming/master/phd/assistant/rec_applicant/phd_applicant/graduated)
-- grade    = academic year label (大二/大三/准研一/研一/博一 …), most useful for assistants & incoming
-- school   = home institution (important for applicants), previously buried in notes
ALTER TABLE students ADD COLUMN category TEXT NOT NULL DEFAULT 'master';
ALTER TABLE students ADD COLUMN grade TEXT;
ALTER TABLE students ADD COLUMN school TEXT;
