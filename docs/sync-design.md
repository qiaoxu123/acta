# Cloud Sync — Design

Acta is **local-first**: all data lives in a local SQLite database and the app
works fully offline.

> **Status (v0.5):** an opt-in **WebDAV** sync is now implemented (`src/sync/`).
> It uses the snapshot + last-write-wins approach described below (the
> "file-sync folder" option). Configure it in Settings → Cloud sync. The rest of
> this document records the design and the room left for a richer engine.

## What's already in place

1. **UUID primary keys** on every row (`id TEXT`). Generated client-side
   (`src/lib/ids.ts`), so rows created on different devices never collide and
   can be merged.
2. **Change metadata on every table**:
   - `created_at`, `updated_at` — ISO-8601 UTC timestamps
   - `deleted_at` — soft-delete tombstone (NULL = live). Deletions are data, so
     they can be propagated instead of "disappearing".
   - `sync_status` — `'dirty'` for locally-changed rows, `'clean'` once a row
     has been pushed to a remote. Today everything stays `'dirty'`.
3. **Single write gateway** (`src/db/mutate.ts`). UI never writes SQL directly;
   every create/update/delete stamps `updated_at` and marks the row `'dirty'`.
   This guarantees the change log a sync engine needs is always accurate.
4. **Full export/import** (`src/lib/backup.ts`). A whole-database JSON snapshot —
   the manual stand-in for sync today, and a useful debugging/seed format later.

## The future sync engine

```
interface SyncProvider {
  pull(since: string): Promise<RemoteChange[]>;   // rows changed after a cursor
  push(changes: LocalChange[]): Promise<void>;    // upload dirty rows + tombstones
}
```

Planned flow (incremental, last-write-wins):

1. Collect local `sync_status = 'dirty'` rows → `push()`.
2. `pull(lastSyncedAt)` remote changes.
3. Merge per row by `max(updated_at)` (LWW). Tombstones (`deleted_at`) win over
   stale edits.
4. Mark merged local rows `'clean'`; persist a new sync cursor.

### Conflict strategy

- **v1: Last-write-wins by `updated_at`.** Simple, predictable, good enough for a
  single-user-multi-device scenario (the common case here).
- **v2 (optional): field-level merge / CRDT** for long free-text fields
  (review comments, notes) where two devices edited different parts.

### Backend options (provider stays swappable)

| Option | Notes |
| --- | --- |
| Supabase / Postgres + Row Level Security | Easiest hosted SQL, realtime, auth |
| A tiny custom REST endpoint | Full control, minimal surface |
| File-sync folder (iCloud / Dropbox / OneDrive) | No server; sync the JSON snapshot or a per-change log file |

Because writes funnel through one gateway and every row carries identity +
timestamps + tombstones, adding any of these is additive — no schema migration
of existing concepts is required, only new sync bookkeeping (a cursor table and,
optionally, a per-change journal).
