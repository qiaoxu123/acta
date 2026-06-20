import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { setDriver } from "../src/db/client";
import { applyAction } from "../src/core/actions";
import { ACTIONS } from "../src/core/schema";
import { ingestText } from "../src/ai/ingest";
import { createClaudeProvider } from "../src/ai/claude";
import { createNodeDriver } from "./driver-node";
import { config, resolveDbPath } from "./paths";

/**
 * Acta local HTTP API.
 *
 * A thin, language-agnostic surface over the action layer so external
 * automation (an email-parsing worker, the 小龙虾 agent, scripts) can read and
 * update the same local database the desktop app uses. Bound to loopback by
 * default; set ACTA_API_TOKEN to require `Authorization: Bearer <token>`.
 *
 * Endpoints
 *   GET  /health              → { ok, db }
 *   GET  /actions             → action catalog (names + JSON schemas) for agents
 *   POST /actions/:name       → run one action with a JSON body
 *   POST /ingest              → { text, apply?, hint? } email/text → Claude → actions
 *   GET  /agenda              → convenience for the get_agenda action
 */

const dbPath = resolveDbPath();
setDriver(createNodeDriver(dbPath));

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json" });
  res.end(json);
}

function readJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 5_000_000) reject(new Error("payload too large"));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function authorized(req: IncomingMessage): boolean {
  if (!config.token) return true; // loopback-only trust when no token set
  return req.headers.authorization === `Bearer ${config.token}`;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${config.host}`);
    const path = url.pathname;
    const method = req.method || "GET";

    if (method === "GET" && path === "/health")
      return send(res, 200, { ok: true, db: dbPath, actions: ACTIONS.length });

    if (!authorized(req)) return send(res, 401, { ok: false, error: "unauthorized" });

    if (method === "GET" && path === "/actions")
      return send(res, 200, { ok: true, actions: ACTIONS });

    if (method === "GET" && path === "/agenda")
      return send(res, 200, await applyAction("get_agenda"));

    if (method === "POST" && path === "/ingest") {
      if (!config.anthropicKey)
        return send(res, 400, {
          ok: false,
          error: "ANTHROPIC_API_KEY not set — cannot run AI ingest",
        });
      const body = await readJson(req);
      if (!body.text)
        return send(res, 400, { ok: false, error: "missing 'text'" });
      const provider = createClaudeProvider({
        apiKey: config.anthropicKey,
        model: config.aiModel,
      });
      const result = await ingestText(body.text, {
        provider,
        apply: body.apply !== false,
        context: { hint: body.hint, now: new Date().toISOString() },
      });
      return send(res, 200, { ok: true, ...result });
    }

    const actionMatch = path.match(/^\/actions\/([a-z_]+)$/);
    if (method === "POST" && actionMatch) {
      const body = await readJson(req);
      const result = await applyAction(actionMatch[1], body);
      return send(res, 200, result);
    }

    send(res, 404, { ok: false, error: "not found" });
  } catch (e) {
    send(res, 400, { ok: false, error: String(e instanceof Error ? e.message : e) });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`Acta API on http://${config.host}:${config.port}`);
  console.log(`  database: ${dbPath}`);
  console.log(`  auth: ${config.token ? "Bearer token required" : "loopback (no token)"}`);
  console.log(`  AI ingest: ${config.anthropicKey ? `enabled (${config.aiModel})` : "disabled (set ANTHROPIC_API_KEY)"}`);
});
