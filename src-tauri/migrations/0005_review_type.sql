-- v5: classify each review by what kind of object is being reviewed
-- (journal / conference / grant / thesis / book / other). Existing rows are all
-- journal/transactions reviews, so 'journal' is the right default back-fill.

ALTER TABLE reviewed_manuscripts ADD COLUMN review_type TEXT NOT NULL DEFAULT 'journal';
