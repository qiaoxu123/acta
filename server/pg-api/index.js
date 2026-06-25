import http from "node:http";
import pgLib from "pg";

const TOKEN = process.env.SYNC_TOKEN || "acta-sync-fx7km2pL9wQ4";
const pool = new pgLib.Pool({
  host:     process.env.PG_HOST     || "localhost",
  port:     Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || "acta_sync",
  user:     process.env.PG_USER     || "acta",
  password: process.env.PG_PASSWORD || "",
  max:      3,
});

const USER = "default"; // single-user; multi-user = token → user_id map

// Ensure tables on start
await pool.query(`
  CREATE TABLE IF NOT EXISTS sync_snapshots (
    user_id    TEXT PRIMARY KEY DEFAULT 'default',
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);
// Attachment blobs: bytes keyed by the client's rel_path (globally unique — it
// contains a UUID). Stored in PG so it survives container restarts.
await pool.query(`
  CREATE TABLE IF NOT EXISTS sync_files (
    key          TEXT PRIMARY KEY,
    content      BYTEA NOT NULL,
    size         INTEGER NOT NULL,
    content_type TEXT,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);

const json = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
};

http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "authorization,content-type");
  res.setHeader("access-control-allow-methods", "GET,PUT,OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  // Health endpoint: no auth
  if (req.method === "GET" && path === "/health") {
    return json(res, 200, { ok: true, db: pool.options.database });
  }

  // Auth gate
  if (req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end("unauthorized");
    return;
  }

  try {
    if (req.method === "GET" && path === "/snapshot") {
      const r = await pool.query("SELECT data FROM sync_snapshots WHERE user_id=$1", [USER]);
      if (!r.rows.length) { res.writeHead(404).end("no snapshot yet"); return; }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(r.rows[0].data));

    } else if (req.method === "PUT" && path === "/snapshot") {
      let body = "";
      for await (const c of req) body += c;
      await pool.query(
        `INSERT INTO sync_snapshots (user_id, data, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (user_id) DO UPDATE SET data=$2, updated_at=now()`,
        [USER, JSON.parse(body)],
      );
      json(res, 200, { ok: true });

    // --- attachment blobs ---
    } else if (req.method === "GET" && path === "/files") {
      const r = await pool.query("SELECT key, size FROM sync_files ORDER BY key");
      json(res, 200, { keys: r.rows });

    } else if (req.method === "GET" && path === "/file") {
      const key = url.searchParams.get("key");
      if (!key) { res.writeHead(400).end("missing key"); return; }
      const r = await pool.query("SELECT content, content_type FROM sync_files WHERE key=$1", [key]);
      if (!r.rows.length) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": r.rows[0].content_type || "application/octet-stream" });
      res.end(r.rows[0].content); // Buffer

    } else if (req.method === "PUT" && path === "/file") {
      const key = url.searchParams.get("key");
      if (!key) { res.writeHead(400).end("missing key"); return; }
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const buf = Buffer.concat(chunks);
      await pool.query(
        `INSERT INTO sync_files (key, content, size, content_type, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (key) DO UPDATE SET content=$2, size=$3, content_type=$4, updated_at=now()`,
        [key, buf, buf.length, req.headers["content-type"] || "application/octet-stream"],
      );
      json(res, 200, { ok: true, size: buf.length });

    } else {
      json(res, 404, { error: "not found" });
    }
  } catch (e) {
    console.error(e);
    json(res, 500, { error: String(e) });
  }
}).listen(Number(process.env.PORT) || 3001, () => {
  console.log(`acta-pg-api ready on :${process.env.PORT || 3001}`);
});
