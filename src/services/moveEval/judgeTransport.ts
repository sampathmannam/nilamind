// Real LLM-judge transport for the move-eval harness — a fetch-based Anthropic Messages API call that plugs
// into makeJudge(call) from judge.ts. This is a DEV/eval tool (runs on the developer's machine, never shipped
// in the app and never touches user data — it scores test probes), so a cloud call + env API key is fine.
// Fetch and key are injectable so the transport is unit-testable with no network and no real key.

export interface AnthropicJudgeOptions {
  /** defaults to process.env.ANTHROPIC_API_KEY */
  apiKey?: string;
  /** judge model — a strong model is worth it; the run is periodic, not per-commit */
  model?: string;
  /** injectable for tests; defaults to global fetch */
  fetchImpl?: typeof fetch;
  endpoint?: string;
  maxTokens?: number;
}

const DEFAULT_ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-opus-4-8";
const ANTHROPIC_VERSION = "2023-06-01";

/** Build a raw prompt→text transport for makeJudge(). Throws immediately if no API key is available. */
export function anthropicJudgeCall(opts: AnthropicJudgeOptions = {}): (prompt: string) => Promise<string> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "anthropicJudgeCall: no API key — set ANTHROPIC_API_KEY or pass { apiKey }. (The judge is a dev-only eval tool.)",
    );
  }
  const fetchImpl = opts.fetchImpl ?? fetch;
  const endpoint = opts.endpoint ?? DEFAULT_ENDPOINT;
  const model = opts.model ?? DEFAULT_MODEL;
  const maxTokens = opts.maxTokens ?? 1024;

  return async (prompt: string): Promise<string> => {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      let detail = "";
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
      throw new Error(`judge request failed: HTTP ${res.status} ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("");
    if (!text) throw new Error("judge request returned no text content");
    return text;
  };
}
