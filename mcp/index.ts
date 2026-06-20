import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ACTIONS } from "../src/core/schema";

/**
 * Acta MCP server — exposes the action catalog (and an `ingest_text` tool) to
 * any MCP client (Claude Desktop / Claude Code, 小龙虾, …). It is a thin wrapper
 * that forwards calls to the local HTTP API, so there is one source of truth for
 * behavior and the DB is only opened by the service.
 *
 * Env: ACTA_API_URL (default http://127.0.0.1:8787), ACTA_API_TOKEN.
 */

const API_URL = process.env.ACTA_API_URL || "http://127.0.0.1:8787";
const TOKEN = process.env.ACTA_API_TOKEN || "";

async function post(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

const INGEST_TOOL = {
  name: "ingest_text",
  description:
    "Parse an academic email or note with AI and create/update the matching " +
    "venue, review, paper, or task records. Set apply=false to preview only.",
  inputSchema: {
    type: "object",
    properties: {
      text: { type: "string", description: "The email body or note to parse" },
      apply: { type: "boolean", description: "Apply changes (default true)" },
      hint: { type: "string", description: "Optional steering hint" },
    },
    required: ["text"],
  },
};

const server = new Server(
  { name: "acta", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    ...ACTIONS.map((a) => ({
      name: a.name,
      description: a.description,
      inputSchema: { type: "object" as const, ...a.inputSchema },
    })),
    INGEST_TOOL,
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  const result =
    name === "ingest_text"
      ? await post("/ingest", args)
      : await post(`/actions/${name}`, args);
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

await server.connect(new StdioServerTransport());
console.error(`Acta MCP server ready (API: ${API_URL})`);
