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
// Ensure table on start
await pool.query(`
  CREATE TABLE IF NOT EXISTS sync_snapshots (
    user_id    TEXT PRIMARY KEY DEFAULT 'default',
    data       JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);

http.createServer(async (req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "authorization,content-type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  // Health endpoint: no auth
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, db: pool.options.database }));
    return;
  }

  const auth = req.headers.authorization;
  if (auth !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end("unauthorized");
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/snapshot") {
      const r = await pool.query("SELECT data FROM sync_snapshots WHERE user_id=$1", [USER]);
      if (!r.rows.length) { res.writeHead(404).end("no snapshot yet"); return; }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(r.rows[0].data));

    } else if (req.method === "PUT" && req.url === "/snapshot") {
      let body = "";
      for await (const c of req) body += c;
      await pool.query(
        `INSERT INTO sync_snapshots (user_id, data, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (user_id) DO UPDATE SET data=$2, updated_at=now()`,
        [USER, JSON.parse(body)],
      );
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"ok":true}');

    } else if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, db: pool.options.database }));

    } else {
      res.writeHead(404, { "content-type": "application/json" });
      res.end('{"error":"not found"}');
    }
  } catch (e) {
    console.error(e);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: String(e) }));
  }
}).listen(Number(process.env.PORT) || 3001, () => {
  console.log(`acta-pg-api ready on :${process.env.PORT || 3001}`);
});
