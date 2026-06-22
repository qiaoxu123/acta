-- v8: store the one-click action links from a review invitation email so the
-- reviewer can respond from Acta without reopening the mailbox. While invited:
-- agree / decline / unavailable reply links. After agreeing: review_url is the
-- Reviewer Center link.

ALTER TABLE reviewed_manuscripts ADD COLUMN agree_url TEXT;
ALTER TABLE reviewed_manuscripts ADD COLUMN decline_url TEXT;
ALTER TABLE reviewed_manuscripts ADD COLUMN unavailable_url TEXT;
