import { ACTIONS } from "../core/schema";
import type { ActionCall, AiProvider, ExtractContext } from "./provider";

/**
 * Claude (Anthropic Messages API) provider. The action registry is exposed as
 * tool definitions; the model reads the text and emits `tool_use` blocks, which
 * we collect as ActionCalls. Browser-safe: it only uses `fetch` and never reads
 * `process` at import time (config is injected).
 */

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = "claude-sonnet-4-6";

const SYSTEM = `You extract structured records from academic emails and notes for the app "Acta".
Read the user's text and call the appropriate tools to create or update venues, reviews, papers, or tasks.
Rules:
- Only call a tool when the text clearly supports it; never invent dates or titles.
- Dates/times are LOCAL WALL-CLOCK ("YYYY-MM-DDTHH:mm") in the record's timezone. For conference deadlines default the timezone to "AoE" unless the text says otherwise.
- Resolve relative dates ("next Friday") against the provided current date.
- Prefer updating an existing record (fill the "match" object) when the email references one.
- You may call multiple tools if the text covers several items.`;

function toAnthropicTools() {
  return ACTIONS.map((a) => ({
    name: a.name,
    description: a.description,
    input_schema: { type: "object", ...(a.inputSchema as object) },
  }));
}

export function createClaudeProvider(config: ClaudeConfig): AiProvider {
  const model = config.model || DEFAULT_MODEL;
  const baseUrl = config.baseUrl || "https://api.anthropic.com";
  const maxTokens = config.maxTokens ?? 2048;

  return {
    async extractActions(
      text: string,
      context?: ExtractContext,
    ): Promise<ActionCall[]> {
      const now = context?.now || new Date().toISOString();
      const userContent =
        `Current date: ${now}\n` +
        (context?.hint ? `Hint: ${context.hint}\n` : "") +
        `\n---\n${text}`;

      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: SYSTEM,
          tools: toAnthropicTools(),
          tool_choice: { type: "auto" },
          messages: [{ role: "user", content: userContent }],
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Claude API ${res.status}: ${detail.slice(0, 500)}`);
      }

      const data = (await res.json()) as {
        content?: { type: string; name?: string; input?: unknown }[];
      };
      return (data.content ?? [])
        .filter((b) => b.type === "tool_use" && b.name)
        .map((b) => ({
          name: b.name as string,
          input: (b.input as Record<string, unknown>) ?? {},
        }));
    },
  };
}
