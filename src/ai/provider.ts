/** AI extraction is behind this interface so the model/provider is swappable
 *  (Claude today; OpenAI-compatible or a rules-based parser later) without
 *  touching the ingest pipeline or the action layer. */

export interface ActionCall {
  name: string;
  input: Record<string, unknown>;
}

export interface ExtractContext {
  /** Current date (ISO) so the model can resolve relative dates in the text. */
  now?: string;
  /** Optional steering hint, e.g. "this is a review-invitation email". */
  hint?: string;
}

export interface AiProvider {
  /** Turn unstructured text (e.g. an email) into the actions to apply. */
  extractActions(text: string, context?: ExtractContext): Promise<ActionCall[]>;
}
