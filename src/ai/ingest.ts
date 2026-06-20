import { applyAction } from "../core/actions";
import type { ActionCall, AiProvider, ExtractContext } from "./provider";

export interface AppliedAction {
  name: string;
  input: Record<string, unknown>;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface IngestResult {
  /** What the model proposed. */
  actions: ActionCall[];
  /** Results of applying them (empty when `apply: false` — preview mode). */
  applied: AppliedAction[];
}

export interface IngestOptions {
  provider: AiProvider;
  /** When false, only extract and return the proposed actions (dry run). */
  apply?: boolean;
  context?: ExtractContext;
}

/**
 * The end-to-end ingest pipeline: unstructured text → proposed actions → apply.
 * This is what an email worker or the in-app "paste email" box calls. Set
 * `apply: false` to preview the extracted actions before committing.
 */
export async function ingestText(
  text: string,
  opts: IngestOptions,
): Promise<IngestResult> {
  const actions = await opts.provider.extractActions(text, opts.context);
  if (opts.apply === false) return { actions, applied: [] };

  const applied: AppliedAction[] = [];
  for (const call of actions) {
    try {
      const result = await applyAction(call.name, call.input);
      applied.push({ name: call.name, input: call.input, ok: true, result });
    } catch (e) {
      applied.push({
        name: call.name,
        input: call.input,
        ok: false,
        error: String(e instanceof Error ? e.message : e),
      });
    }
  }
  return { actions, applied };
}
