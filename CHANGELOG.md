# Changelog

## [0.1.0] - 2026-06-20

Initial scaffold and first working milestone.

### Features

- **App shell**: Zotero-style layout (sidebar + list + detail panes), hash
  routing, light/dark theme.
- **Venues & Deadlines**: CRUD for journals/conferences and their editions
  (calls for papers). Per-edition deadlines (abstract, full paper, rebuttal,
  notification, camera-ready, event dates) with **AoE / timezone-aware** entry
  and live countdowns.
- **Reviews**: CRUD for reviewed manuscripts and per-round records — your
  recommendation, confidence, due date, and the review comments you gave.
- **My Papers**: CRUD for your papers with a status lifecycle and a timeline of
  submission/revision rounds, decisions, and revision deadlines.
- **Dashboard**: a unified countdown timeline aggregating every dated item
  across venues, reviews, papers, and tasks.
- **Settings**: full JSON export/import of the local database.

### Design Rationale

- **Tauri + SQLite** chosen over Electron for a small footprint and a native,
  Zotero-like feel; SQLite gives relational queries and a clean path to sync.
- **Local-first now, sync-ready later**: every row carries
  `uuid / created_at / updated_at / deleted_at / sync_status`, and all writes go
  through a single gateway (`src/db/mutate.ts`) so change tracking is always
  correct. See `docs/sync-design.md`.
- **Deadlines stored as absolute UTC instants** with the entry timezone kept for
  display, so AoE and cross-timezone deadlines stay unambiguous.

### Notes & Caveats

- Cloud sync is designed but not implemented; JSON export/import is the interim
  backup/migration path.
- Markdown in review/revision text is stored and shown as plain monospace for
  now (no rendering yet).
