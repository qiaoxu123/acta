# Changelog

## [0.2.0] - 2026-06-20

Reserve an AI-callable automation interface (no UI change).

### Features

- **Action layer** (`src/core/`): a transport-agnostic catalog of named actions
  with JSON Schemas (`upsert_venue/review/paper`, `add_task`, and read actions),
  dispatched through one `applyAction()` entry point. Upserts merge on natural
  keys (id → short_name/manuscript_id → title) so repeated emails don't dup.
- **Local HTTP API** (`server/`, `npm run server`): loopback JSON service over
  the action layer — `/health`, `/actions` (discovery), `/actions/:name`,
  `/ingest`, `/agenda`. Optional bearer-token auth. Backed by Node's built-in
  `node:sqlite` against the **same** app database (WAL).
- **AI ingest** (`src/ai/`): `POST /ingest { text }` runs Claude (Anthropic
  tool-use) to turn an email/note into actions and apply them; `apply:false`
  previews. Provider is behind an `AiProvider` interface (swappable).
- **MCP server** (`mcp/`, `npm run mcp`): exposes the same catalog + an
  `ingest_text` tool to MCP clients (小龙虾 / Claude Desktop / Claude Code),
  forwarding to the HTTP API.
- Docs: `docs/ai-api.md`, `.env.example`.

### Design Rationale

- **One contract, two transports**: HTTP for any language/worker, MCP for AI
  agents — both call the identical action layer the in-app UI can also use, so
  there is a single source of truth for behavior and the database.
- **Pluggable SQL driver** (`src/db/client.ts` `setDriver()`): the same
  repositories run under tauri-plugin-sql (app) or `node:sqlite` (service); the
  default Tauri driver is lazy-loaded so the modules import cleanly in Node.

### Notes & Caveats

- App + service share the SQLite file via WAL; retry on rare `database is locked`.
- `ACTA_DB_PATH` auto-resolution is best-effort per-OS — set it explicitly.

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
