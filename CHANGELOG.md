# Changelog

## [0.13.0] - 2026-06-23

First-run identity picker + per-module on/off — tailor Acta to how you work.

### Features

- **First-run onboarding**: on a fresh install an overlay asks for your identity
  — Student / Researcher (PhD) / Faculty (PI) / Custom — and presets which
  modules are enabled (e.g. a student skips peer-review, projects and patents).
  The module checklist is editable before you confirm.
- **Module on/off** (`acta.modules`): disabled modules disappear from the
  sidebar (empty groups collapse) and the dashboard. A new **Modules** section in
  Settings toggles each module individually or re-applies a role preset, so the
  choice isn't locked to first run.

### Design Rationale

- Modules are view-level visibility, not data deletion — turning a module off
  only hides it; the records and routes remain, so re-enabling restores
  everything untouched. Default (pre-onboarding) is all-on, so nothing is hidden
  until the user actively chooses.

## [0.12.0] - 2026-06-23

Work Reports module — weekly progress write-ups for group meetings.

### Features

- **Work Reports module** (`reports` table, migration v10; sidebar “Research”
  group): periodic progress reports built for 组会. **“New this week”** computes
  the current Mon–Sun period and seeds a four-section template — Done / In
  progress / Next / Blockers — pre-filled by **aggregating** what actually
  happened that week from across the app (idea progress & findings, paper
  submissions/decisions, review submissions). Reports list groups by month
  (collapsible); the report page renders Markdown, is editable in place, can be
  **re-aggregated** for its period, and **copied / exported as Markdown** to drop
  into slides or send to the group. Exposed over the API (`list_reports`,
  `upsert_report`) and surfaced as a dashboard card.

### Design Rationale

- Aggregation seeds, never overwrites silently: creating a weekly report fills
  Done/In-progress from real activity; the on-page “re-aggregate” asks before
  replacing the body. The cross-module pull reuses the same tables the lists use,
  so nothing is double-entered.

## [0.11.0] - 2026-06-23

Notes module; dashboard cards become resizable, pinnable widgets.

### Features

- **Notes module** (`notes` table, migration v9; sidebar “Research” group): a
  tagged Markdown knowledge base for 心得体会 / reading notes / method write-ups —
  distinct from sparks (raw inbox) and ideas (tracked projects). Flat list with
  full-text **search** + **tag filter**, pin-to-top, archive. The note page
  renders Markdown and is **editable in place** (✎ / double-click, ⌘↵ to save);
  title & tags edit via a small form. Exposed over the API too (`list_notes`,
  `upsert_note`) and surfaced as a dashboard card.
- **Dashboard cards = macOS-style widgets**: each card can be **resized**
  (small → medium → large; span + row count), **pinned to the top**, hidden,
  collapsed and drag-reordered — all persisted. Slow-moving modules (patents,
  sparks, notes) default to small; active ones to medium. Denser auto-fill grid
  (`grid-auto-flow: dense`) packs cards to fill the width.

## [0.10.0] - 2026-06-23

Dashboard becomes a per-module work-status overview; idea-log timeline gains a
master/detail reading pane with editable Markdown.

### Features

- **Dashboard overview grid**: the dashboard is no longer one flat deadline
  timeline — it's a card per module (reviews, papers, conferences, journals,
  projects, ideas, sparks, patents), each showing its count, a status-pill
  breakdown, and the few most relevant rows (sorted by each module's own most
  useful dimension — nearest due, revision deadline, lifecycle stage…). A
  cross-module **focus bar** pins the single nearest deadline plus key counts
  (to-review / in-submission / to-do / due ≤14d). Cards can be **collapsed**,
  **hidden** (restored from the "Hidden" menu), **drag-reordered**, and shown at
  two **densities** — all persisted (`acta.dash.layout`) so you can tune the
  page to fit one screen without scrolling.
- **Idea-log timeline → master/detail**: on the full-width idea page the
  discussion/progress log is now a compact selectable git-graph sidebar (badge +
  date + 2-line preview) with the selected entry's full body in a reading pane,
  instead of a wall of full-width text blocks. The narrow dock keeps the stacked
  timeline.
- **Markdown everywhere in logs**: log bodies render as Markdown (new `marked`
  dependency + `Markdown` component + `.md` prose styles). The detail pane is
  **editable in place** — click ✎ or double-click the text to edit the Markdown
  source, ⌘↵ to save (`updateIdeaLog`).

### Fixes

- **Double-click-to-maximize is reliable again**: Tauri's drag region already
  maximizes on macOS double-click; the app's extra React `toggleMaximize` made
  it double-fire and cancel itself out (maximize-then-restore). Removed the JS
  handler and switched the sidebar/top bar to `data-tauri-drag-region="deep"`
  so the whole bar drags and zooms; breadcrumb crumbs marked `role="link"` stay
  clickable.

## [0.9.0] - 2026-06-23

Full headless-API coverage for every module; sidebar regrouped by intent.

### Features

- **Every module is now reachable over the local HTTP API / MCP** (`server/`,
  `mcp/`), not just venues/reviews/papers. The action catalog (`GET /actions`)
  grows from 8 to 20:
  - **Venues**: `list_venues` (filter by kind) alongside the existing
    `find_venue` / `upsert_venue`.
  - **Patents**: `list_patents`, `upsert_patent` (match by id → app_number →
    title).
  - **Projects**: `list_projects` (filter by category), `upsert_project` (match
    by id → number → name; `apply_deadline` accepts a local wall-clock time +
    `timezone` and is stored as a UTC instant, like venue deadlines).
  - **Ideas**: `list_ideas`, `upsert_idea` (match by id → title, with an
    optional append-only `logs[]` for the git-graph timeline), and
    `add_idea_log` to append one note/finding/decision/progress entry.
  - **Sparks**: `list_sparks`, `upsert_spark`, and `promote_spark` (turn a spark
    into a tracked idea and archive it off the board).
  - **Tasks**: `list_tasks` (open by default; `include_done` to include done).
- So an agent / script (the 小龙虾 worker, a cron job, Claude via MCP) can now
  read and write ideas, inspiration, patents, projects and tasks through the
  same action layer the desktop UI uses — upserts match on natural keys, so
  repeated calls merge instead of duplicating.

### Design Rationale

- All new handlers route through `applyAction()` and the existing repositories /
  mutation gateway, so writes stay sync-ready (`sync_status='dirty'`) and there's
  one source of truth. No new transport code: adding entries to the `ACTIONS`
  registry auto-exposes them over both HTTP (`POST /actions/:name`) and MCP.
- Reads default to scope `all` (the automation surface wants everything, not just
  the UI's "active" filter); list actions accept an optional `scope`/`kind`/
  `category` filter.

### Fixes

- **Sidebar regrouped by intent**: journals / conferences / reviews now sit under
  a **Tracking** group (external things to watch), while papers / patents are
  **Output** (own work); the lone "Other" group is retired.

## [0.8.0] - 2026-06-22

wolai-style breadcrumb navigation replaces the tab strip, plus resizable list columns.

### Features

- **Breadcrumb path bar replaces workspace tabs**: the browser-style tab strip is
  gone. The top bar now shows a wolai-style location path — `〔icon〕section ›
  record` (e.g. `📚 Reviews › TMC-2026-05-2172`) — with the section segment
  clickable to jump back to its list. Clicking a list row navigates into the
  record's full-width view; back/forward buttons walk history. Cleaner, less
  chrome, no tab pile-up. The bar still doubles as the draggable macOS title bar
  (double-click to zoom).
- **Drag-to-resize table columns** (Zotero-style): every list (reviews, papers,
  patents, projects, ideas, journals, conferences) has draggable column borders.
  Drag a column's right edge to resize; double-click the handle to reset. Widths
  persist per-table in `localStorage` (`acta.cols.<table>`), so journals and
  conferences remember their own layouts.

### Design Rationale

- Tabs were a Zotero-ism that added state (open set, order, focus, persistence)
  and screen chrome for little gain in a single-window tool. A breadcrumb conveys
  *where you are* with near-zero chrome and leans on browser-style back/forward
  for *where you were*. Item pages publish their `section › record` trail to a
  small zustand store (`src/store/breadcrumb.ts`) via a now-headless `Breadcrumb`
  component; the top bar renders that trail only when it matches the live path and
  otherwise derives a section-only crumb from the route — so a stale title can
  never leak onto a list page.
- Column widths live in `localStorage`, not the DB: they're per-device view
  preferences, not synced data. Persisted once on drag-end (not per mousemove).

### Notes & Caveats

- Removing tabs drops middle-click-close, right-click "close others", multi-tab
  restore, and per-list selection memory. Intentional for the breadcrumb model.
- Deleted `TabBar.tsx`, `useTabSync.ts`, `store/tabs.ts`; slimmed `lib/tabs.ts`
  to section-routing helpers (`sectionInfo`, `itemHref`). No DB/migration change.

## [0.7.0] - 2026-06-21

Research-idea tracker with a git-graph evolution timeline.

### Features

- **Ideas module** (`src/features/ideas/`, `ideas` + `idea_logs` tables,
  migration v6): capture research ideas and track them through a lifecycle —
  spark → exploring → validated → building → done / paused / dropped / merged —
  so temporary ideas, research, rejection, merging, and engineering all live in
  one place. Each idea carries a category (idea / experiment / course / hardware
  / simulation / paper / engineering), priority, tags, a GitHub/code link, and
  notes. New sidebar group "Research".
- **Git-graph evolution timeline**: each idea has a discussion/progress log
  rendered as a vertical git-graph — one coloured node per event (note = grey,
  finding = blue, decision = amber diamond, progress = green), newest on top,
  connected by a rail. Makes the thinking process (what was sparked, researched,
  decided, rejected) visible at a glance.
- Ideas open in tabs and integrate with the breadcrumb, dock, and sync layers
  like every other module; the six seeded research directions (VLM benchmarking,
  VLN, quadruped robotics, 3D reconstruction, 3D delivery sim, traffic-offloading
  paper) ship pre-classified.
- **Sparks / brainstorm inbox** (`src/features/sparks/`, `sparks` table,
  migration v7): a low-friction capture board for flashes of inspiration and
  observed problems — a quick-add bar (toggle spark/problem, type, Enter) and two
  columns. **Promote to idea** turns a keeper into a tracked idea (status: spark)
  and opens it; the rest stay as a well of future inspiration. New "Sparks"
  sidebar entry under Research.
- **Review invitation action links** (migration v8): reviews store the
  Agree / Decline / Unavailable reply links from the invitation email plus the
  review-system link. While a review is "invited" the detail shows one-click
  reply buttons; once accepted it shows "open review system" — so invitations can
  be answered without reopening the mailbox.
- **Window: double-click the tab bar (or sidebar header) to zoom/maximize**
  (the overlay title bar wasn't forwarding macOS's native double-click).

### Fixes

- **External links now actually open.** The webview ignores `target="_blank"`, so
  every external link (review system, Overleaf, repos, venue site, idea repo,
  invitation reply links) was dead. Added `tauri-plugin-opener` and route all
  external links through it (`src/lib/external.ts`, `src/components/ui/Ext.tsx`).
- **Searching reviews expands collapsed groups**, so matches inside the (default-
  collapsed) 已邀请 bucket are no longer hidden.

### Design Rationale

- The log is modelled as typed events rather than free text so the timeline can
  colour-code and (later) filter by what kind of thinking happened. The idea's
  own status captures the coarse lifecycle; the log captures the fine-grained
  story.

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
- **Back / forward buttons** in the tab bar navigate the in-app history.
- **Dashboard items open in tabs**: clicking a dated item on the dashboard (and
  saving a new record) now opens it in a tab instead of the old in-list preview.
- **Breadcrumb** at the top of every item tab (section › record) for location
  context; the section crumb links back to the list.
- **Review type** (`review_type`, migration v5): each review is classified as
  journal / conference / grant / thesis / book / other — shown as a column and
  badge, and available as a grouping. Existing rows back-fill to "journal".
- **Top-bar alignment**: the tab bar drops into the same band as the sidebar
  "Acta" header (both below the overlaid traffic lights); item pages no longer
  double-render the title (the detail header is the single title).

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
