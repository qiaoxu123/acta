-- Users: local account system. bcrypt hashed passwords, no email verification
-- for now. One row per registered user.
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,               -- bcrypt hash
  display_name TEXT,                        -- optional display name
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);

-- sessions: who is currently logged in on this device (one row, device-scoped)
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY DEFAULT 'current',
  user_id    TEXT NOT NULL REFERENCES users(id),
  username   TEXT NOT NULL,
  login_at   TEXT NOT NULL,
  expires_at TEXT                              -- NULL = never expires (local)
);
