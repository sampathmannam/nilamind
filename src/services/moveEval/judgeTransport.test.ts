import { describe, it, expect } from "vitest";
import { anthropicJudgeCall } from "./judgeTransport";

function fakeFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () =>
    ({
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response) as unknown as typeof fetch;
}

const goodResponse = { content: [{ type: "text", text: '{"name":true,"holistic":3}' }] };

describe("anthropicJudgeCall", () => {
  it("POSTs the prompt and returns the text content", async () => {
    let captured: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return { ok: true, status: 200, json: async () => goodResponse } as Response;
    }) as unknown as typeof fetch;

    const call = anthropicJudgeCall({ apiKey: "sk-test", fetchImpl });
    const out = await call("judge this reply");

    expect(out).toBe('{"name":true,"holistic":3}');
    expect(captured!.url).toContain("api.anthropic.com");
    const sentBody = JSON.parse(captured!.init.body as string);
    expect(sentBody.messages[0].content).toContain("judge this reply");
    expect((captured!.init.headers as Record<string, string>)["x-api-key"]).toBe("sk-test");
    expect((captured!.init.headers as Record<string, string>)["anthropic-version"]).toBeTruthy();
  });

  it("throws a clear error when no API key is available", () => {
    // no apiKey option and (in test) no env var
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => anthropicJudgeCall({ fetchImpl: fakeFetch(goodResponse) })).toThrow(/api key/i);
    } finally {
      if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
    }
  });

  it("throws on a non-OK HTTP response", async () => {
    const call = anthropicJudgeCall({ apiKey: "sk-test", fetchImpl: fakeFetch({ error: "rate limit" }, false, 429) });
    await expect(call("x")).rejects.toThrow(/429|judge request failed/i);
  });

  it("uses the provided model + max_tokens in the request", async () => {
    let sentBody: any = null;
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      sentBody = JSON.parse(init.body as string);
      return { ok: true, status: 200, json: async () => goodResponse } as Response;
    }) as unknown as typeof fetch;
    const call = anthropicJudgeCall({ apiKey: "sk-test", model: "claude-test-model", fetchImpl });
    await call("x");
    expect(sentBody.model).toBe("claude-test-model");
    expect(sentBody.max_tokens).toBeGreaterThan(0);
  });
});
