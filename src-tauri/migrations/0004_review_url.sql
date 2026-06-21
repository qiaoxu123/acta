-- v4: direct link to the manuscript's review system (ScholarOne / Editorial
-- Manager / IEEE Author Portal …), captured from invitation emails so each
-- review record can jump straight to its submission site.
-- Applied once by the app's sqlx migrator (version-tracked, so the non-
-- idempotent ADD COLUMN is safe).

ALTER TABLE reviewed_manuscripts ADD COLUMN review_url TEXT;
