# Acta

A **local-first, cross-platform desktop app** for the academic workflow — built
in the spirit of [Zotero](https://www.zotero.org/): clean, calm, and focused.

Acta keeps three things that usually scatter across calendars, inboxes, and
spreadsheets in one place:

- 📅 **Venues & Deadlines** — track journals and conferences and every date that
  matters per call-for-papers (abstract, full-paper, rebuttal, notification,
  camera-ready, the event itself), with **Anywhere-on-Earth (AoE)** timezone
  handling and live countdowns.
- 📝 **Reviews** — record the manuscripts you review: your recommendation,
  confidence, and the actual comments you gave, round by round.
- 📄 **My Papers** — follow each of your papers through its lifecycle, with a
  timeline of submission/revision rounds and their deadlines.

A unified **Dashboard** rolls every dated item into one countdown timeline.

> **Status:** early (v0.1). Data is stored locally in SQLite. Cloud sync is not
> built yet but the data model is designed for it — see
> [`docs/sync-design.md`](docs/sync-design.md).

## Tech stack

| Layer | Choice |
| --- | --- |
| Shell | [Tauri 2](https://tauri.app) (Rust) — small, fast, native |
| UI | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS (Zotero-style neutral theme, light/dark) |
| Data | SQLite via `tauri-plugin-sql`, migrations Rust-side |
| Dates | `date-fns` + `date-fns-tz` (AoE support) |

## Develop

Prerequisites: [Node.js](https://nodejs.org) 18+, [Rust](https://rustup.rs), and
the [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your
OS.

```bash
npm install
npm run tauri dev      # launch the desktop app with hot reload
```

## Build

```bash
npm run tauri build    # produce a native installer for the current OS
```

CI builds macOS and Windows artifacts on every push — see
[`.github/workflows/build.yml`](.github/workflows/build.yml).

## Automation API (AI-callable)

Acta reserves a clean interface so external automation can read/update the same
local database — e.g. an **email worker** that auto-files deadlines and decisions,
or an AI agent (小龙虾 / Claude). One action layer is exposed over a **local HTTP
API** (`npm run server`) and an **MCP server** (`npm run mcp`), with a Claude-
backed `/ingest` that turns raw emails into structured records. See
[`docs/ai-api.md`](docs/ai-api.md).

## Data & backups

Everything is stored in a local SQLite database (`acta.db` in the app data dir).
**Settings → Export JSON** writes a full snapshot you can back up or move to
another machine; **Import JSON** restores it.

## License

MIT © qiaoxu123
