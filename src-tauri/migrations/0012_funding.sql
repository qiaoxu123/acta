-- Funding: track grant/contract amounts, expenditures, and remaining balances.
CREATE TABLE IF NOT EXISTS funding (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,                 -- project / grant name
  source         TEXT,                          -- funding source (NSFC, 省自然, 横向…)
  number         TEXT,                          -- grant/contract number
  total_amount   REAL,                          -- total budget
  spent          REAL NOT NULL DEFAULT 0,       -- cumulative expenditure
  balance        REAL,                          -- remaining (total - spent; computed on read)
  category       TEXT NOT NULL DEFAULT 'grant', -- grant(纵向) | contract(横向) | other
  status         TEXT NOT NULL DEFAULT 'active', -- active | completed | closed
  start_date     TEXT,                          -- YYYY-MM-DD
  end_date       TEXT,                          -- YYYY-MM-DD
  notes          TEXT,                          -- free-text remarks
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT,
  archived_at    TEXT,
  sync_status    TEXT NOT NULL DEFAULT 'dirty'
);
