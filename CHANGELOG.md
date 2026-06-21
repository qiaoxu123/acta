# Changelog

## [0.6.0] - 2026-06-21

Zotero-style tabbed workspace, dockable preview panel, and review-system links.

### Features

- **Tabbed workspace** (`src/store/tabs.ts`, `src/lib/tabs.ts`,
  `src/components/layout/TabBar.tsx` + `useTabSync.ts`): a browser-like tab strip
  above the routed content. **Double-click** a list row to open the record in a
  dedicated full-width management tab (`/<section>/item/:id`); **single-click**
  still previews it in the side panel. Tabs de-dupe (re-opening focuses the
  existing tab), are closeable (X / middle-click), support right-click
  "close others", and persist across restarts. Tabs are route-driven — the
  store records hrefs and `useTabSync` is the single router↔store reconciler, so
  sidebar clicks, deep links, and back/forward all stay consistent.
- **Dockable preview panel** (`src/store/dockPanel.ts`,
  `src/components/layout/DockPanel.tsx`): the right detail panel can be **pinned**
  (stays open across selections) or **collapsed** to a thin reopen strip. State
  is global and persisted; all five list pages share it via one component.
- **Review-system links**: `reviewed_manuscripts` gains a `review_url` column
  (migration `0004`) with a form field and an "open review system" link in the
  detail view — jump straight to ScholarOne / Editorial Manager / IEEE.
- **Item tabs self-heal**: deleting a record closes its tab; a tab whose record
  no longer exists shows a "back to list" state instead of erroring.
- **Reclaimed macOS title bar**: the window uses an overlay title bar, so the tab
  strip sits flush at the top (draggable) and the sidebar logo tucks under the
  traffic lights — no more wasted top band.

### UX refinements (post-review pass)

- **A single click opens the record in a tab** (focuses the tab if it's already
  open — no duplicates). No double-click, no preview state: clicking a row goes
  straight to its management tab. The old right-side preview panel is retired in
  favor of this; its dock code remains dormant and can be re-enabled if wanted.
- **Safer "close others"**: right-clicking a tab now asks for confirmation
  before closing the rest, instead of silently wiping them.

### Robustness (adversarial review)

- DataTable's single-click timer is cleared on unmount (no navigate-after-unmount).
- A malformed persisted tab href is dropped individually instead of discarding
  the whole saved workspace; a confirmed-gone item tab now removes itself.

### Design Rationale

- **Route-driven tabs over keep-all-mounted**: the app already stores selection
  in the URL, so layering tabs as a presentation view over the existing hash
  router keeps memory low and avoids re-plumbing routing for N live views.
  One-directional data flow (UI → navigate → `useTabSync` → store) with an
  early-return guard prevents navigation feedback loops and StrictMode dupes.
- **Shared detail components**: `ManuscriptDetail` (and the other `XDetail`s)
  render identically in the side panel and the item tab, so the two surfaces
  never drift.

### Notes & Caveats

- `review_url` values are back-filled from invitation emails by a one-off script;
  unmatched manuscripts keep an empty link and can be filled manually in the form.

## [0.5.0] - 2026-06-21

Cross-platform releases + WebDAV multi-device sync.

### Features

- **WebDAV cloud sync** (`src/sync/`): opt-in in Settings. Local save is always
  on; when enabled, the app keeps a single JSON snapshot on a WebDAV server
  (Nextcloud / 坚果云 / Synology…) and converges devices with **last-write-wins
  by `updated_at`**, propagating deletions via tombstones. Syncs on launch, on a
  3-minute interval, and via a "Sync now" button. HTTP runs through Tauri's
  http plugin (Rust side) so any user-configured host works regardless of CSP.
- **Right-side detail panel**: the five table pages now open the selected row's
  detail in a drag-resizable right panel instead of a bottom one.
- **Reviews tidy-up**: non-active status groups collapse by default; statuses
  back-filled from mailbox subject signals.
- **Cross-platform release CI** (`.github/workflows/release.yml`): pushing a
  `v*` tag builds macOS (universal), Windows and Linux installers and publishes
  them to a GitHub Release.

### Design Rationale

- Snapshot + LWW (over a change-log/CRDT) is the simplest correct design for a
  single-user, few-devices tool; the data model's per-row `updated_at` /
  tombstones (reserved since v0.1) make it a small addition.

### Notes & Caveats

- Concurrent edits on two devices within the same sync window can lose the
  earlier push (no ETag/If-Match yet) — fine for personal use; hardening later.
- WebDAV password is stored in local app storage (never committed).

## [0.4.0] - 2026-06-21

Outputs & projects: papers-by-role, patents, grants, grouped sidebar.

### Features

- **Grouped sidebar** with section headers: 【Output】Journals · Conferences ·
  Papers · Patents; 【Projects】Vertical · Horizontal; 【Other】Reviews.
- **Papers classified by my role** (first author / corresponding / advised
  student / co-author): new `my_role` field, group-by-role default, a per-role
  **stats summary bar**, and a role column.
- **Patents** section (migration v3 `patents`): type, status, application/
  publication/grant numbers, inventors, my role; table + detail.
- **Projects** (migration v3 `projects`) split into **Vertical (纵向)** and
  **Horizontal (横向)** nav entries: program, level, funder, role, funding,
  status, and an application deadline that flows into the dashboard countdown.
  Seeded placeholder NSFC (面上/青年) + Jilin grants with the conventional
  ~Mar-20 deadline (tentative, to verify).
- **Reviews**: accepted manuscripts now sort ahead of invited; invited/active
  reviews past their due date are auto-flagged **Overdue**.

### Notes & Caveats

- The headless service never touches `patents`/`projects`/`my_role`; the
  dashboard's project query is guarded so a service-only DB still works.
- NSFC/Jilin deadlines are conventional placeholders — live search couldn't
  reach the (un-indexed) official sites; confirm against each year's guide.

## [0.3.1] - 2026-06-21

Master/detail layout — data-first.

### Features

- **Table + bottom detail**: the three list pages (reviews / papers / venues)
  switched from a narrow side list to a full-width, multi-column data table.
  Clicking a row shows its detail in a **drag-resizable bottom panel**
  (`ResizableBottom`), making far better use of horizontal space.
- **Sortable columns**: click a column header to sort (`DataTable`); a **Due /
  Next-deadline column** with live countdown is computed per row
  (`reviewDueMap` / `paperDueMap` / `venueNextDeadlineMap`).
- Group-by sections (collapsible) and the active/archived toggle carry over into
  the table; the sort dropdown is replaced by clickable headers.

## [0.3.0] - 2026-06-20

UI overhaul + organization features for scale.

### Features

- **Localization**: full zh/en i18n (`src/lib/i18n.ts`), **Chinese by default**,
  switchable from the sidebar; larger base font (18px root).
- **Distinct panes + resizable widths**: three surface tiers (sidebar / list /
  detail) with clearer borders; sidebar and list panes drag-resize and remember
  their width (`ResizablePane`).
- **Sorting**: each list (reviews / papers / venues) has a sort selector
  (updated, status, title, venue/target, name, type).
- **Grouping**: collapsible sections by status / venue / role / type.
- **Archiving ("收纳")**: top-level records (venues, manuscripts, papers) gain an
  `archived_at` column (migration v2). Lists default to **Active**; an
  Active/Archived toggle reveals archived items, and a detail-pane button
  archives/unarchives. Keeps active lists clean as records pile up over years.

### Fixes

- **Migration idempotency**: `0001_init.sql` now uses `IF NOT EXISTS`, so a
  database created by the headless `node:sqlite` service applies cleanly under
  the app's sqlx migrator instead of failing on "table already exists" (which
  had silently prevented the app from loading an externally-seeded DB).

### Design Rationale

- Archiving over hard-deletion: review/paper history is worth keeping but
  shouldn't clutter daily views — `archived_at` (a tombstone-like nullable
  timestamp) hides without losing, and rides the same sync metadata.
- The headless service never references `archived_at` (upserts and reads use the
  "all" scope), so a service-only database needs no schema upgrade while the app
  manages the column via migration v2.

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
