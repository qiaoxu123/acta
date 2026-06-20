# Acta Automation API (AI-callable)

Acta reserves a clean, AI-callable interface so external automation can read and
update the same local database the desktop app uses — e.g. an **email worker**
that watches your inbox and files conference deadlines / review invitations /
decision letters, or an agent like **小龙虾** managing records for you.

Everything funnels through **one action layer** (`src/core/`), exposed via two
transports that share the same catalog and the same database:

```
                       ┌───────────────────────────┐
 email worker ───HTTP──▶                            │
 curl / scripts ─HTTP──▶  Acta local HTTP API       │
 小龙虾 / Claude ─MCP──▶  (server/) ──┐             │
                       └──────────────┼─────────────┘
                                      ▼
                       src/core/actions.ts  ── applyAction()
                                      ▼
                       repositories ▸ mutate.ts ▸ SQLite (acta.db)
                                      ▲
                       Tauri desktop app ───────────┘ (same file, WAL)
```

- **Single source of truth**: every transport calls `applyAction(name, input)`.
  The action catalog with JSON Schemas lives in `src/core/schema.ts`.
- **Natural-key upserts**: `upsert_*` actions match on id → short_name/manuscript_id → title,
  so repeated emails about the same item **update** instead of duplicating.
- **Sync-ready**: writes go through the same gateway as the UI, stamping
  `updated_at` / tombstones (see [`sync-design.md`](sync-design.md)).

## Run the service

```bash
# Point at the app's database (recommended to set explicitly):
export ACTA_DB_PATH="$HOME/Library/Application Support/io.github.qiaoxu123.acta/acta.db"
export ANTHROPIC_API_KEY=sk-ant-...        # enables /ingest (Claude extraction)
export ACTA_API_TOKEN=$(openssl rand -hex 16)   # optional; requires Bearer auth

npm run server   # → http://127.0.0.1:8787
```

Env vars: `ACTA_DB_PATH`, `ACTA_PORT` (8787), `ACTA_HOST` (127.0.0.1),
`ACTA_API_TOKEN`, `ANTHROPIC_API_KEY`, `ACTA_AI_MODEL` (claude-sonnet-4-6).
The service uses Node's built-in `node:sqlite` (no native deps) and WAL mode so
it can run alongside the app.

## HTTP endpoints

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | — | liveness + resolved db path |
| GET | `/actions` | — | **discovery**: action names + JSON schemas (for agents) |
| POST | `/actions/:name` | action input | run one action |
| POST | `/ingest` | `{ text, apply?, hint? }` | AI: parse text → actions → apply |
| GET | `/agenda` | — | shortcut for `get_agenda` |

If `ACTA_API_TOKEN` is set, send `Authorization: Bearer <token>` (except `/health`).

### Actions (catalog)

Mutating: `upsert_venue`, `upsert_review`, `upsert_paper`, `add_task`.
Read-only: `get_agenda`, `find_venue`, `list_papers`, `list_reviews`.

Full schemas come from `GET /actions`. **Dates** in inputs are local wall-clock
`YYYY-MM-DDTHH:mm` interpreted in the record's `timezone` (default `AoE` for
conference deadlines); the service converts to absolute UTC for storage.

### Examples

```bash
# File a call-for-papers (idempotent: re-running updates the same records)
curl -X POST localhost:8787/actions/upsert_venue -H 'content-type: application/json' -d '{
  "venue": {"name":"IEEE INFOCOM","short_name":"INFOCOM","kind":"conference","rank":"CCF-A"},
  "editions": [{"year":2027,"timezone":"AoE","submission_deadline":"2026-07-31T23:59","location":"London"}]
}'

# Turn a raw decision email into a paper status update via Claude
curl -X POST localhost:8787/ingest -H 'content-type: application/json' -d '{
  "text": "Dear authors, your manuscript \"Edge-MEC Offloading\" (TWC-2026-1234) requires MAJOR revision. Revised version due August 20, 2026.",
  "hint": "decision email for one of my papers"
}'
# → { actions: [{name:"upsert_paper", input:{...}}], applied: [{ok:true, result:{...}}] }

# Preview only (don't write) — set apply:false
curl -X POST localhost:8787/ingest -H 'content-type: application/json' -d '{"text":"...","apply":false}'
```

## Email-worker integration

Your inbox watcher (any language / cron / n8n) only needs to POST the email body:

```
for each new academic email:
    POST /ingest { text: <email body>, hint: <label/folder> }
    inspect .applied[] for ok/errors
```

The AI decides whether it's a CFP, review invite, or decision and calls the
right `upsert_*` action with a `match` block so existing records merge.

## MCP integration (小龙虾 / Claude Desktop / Claude Code)

The MCP server exposes every action plus an `ingest_text` tool, forwarding to the
HTTP API. Start the HTTP service first, then register:

```json
{
  "mcpServers": {
    "acta": {
      "command": "npm",
      "args": ["run", "--silent", "mcp"],
      "cwd": "/Users/xqiao/Workspace/acta",
      "env": { "ACTA_API_URL": "http://127.0.0.1:8787", "ACTA_API_TOKEN": "" }
    }
  }
}
```

Then an agent can call `acta.upsert_venue`, `acta.get_agenda`,
`acta.ingest_text`, etc. directly as tools.

## Swapping the AI provider

Extraction is behind `AiProvider` (`src/ai/provider.ts`). `createClaudeProvider`
(`src/ai/claude.ts`) is the default; an OpenAI-compatible or rules-based provider
can be dropped in without touching the action layer or transports.

## Notes & caveats

- The service and the app share one SQLite file via WAL. Heavy simultaneous
  writes are rare here; if you ever see `database is locked`, retry.
- `ACTA_DB_PATH` resolution is best-effort per-OS; set it explicitly to be safe.
- AI ingest is best paired with `apply:false` previews in any unattended flow you
  don't fully trust yet.
