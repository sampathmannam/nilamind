import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── fetch + localStorage stubs (node env has neither) ──────────────────────
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
};

import { setCloudApiEnabled, setCloudApiKey, setCloudApiUrl, setCloudApiModel, isCloudApiActive } from "./cloudApi";
import { createCloudBackend } from "./cloudLlmAdapter";

// Build a fake OpenAI-style SSE streaming response from an array of token strings.
function makeSseResponse(tokens: string[]): Response {
  const lines = tokens.map((t) => `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}`);
  lines.push("data: [DONE]");
  const bytes = new TextEncoder().encode(lines.join("\n") + "\n");
  let consumed = false;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: () => {
          if (!consumed) { consumed = true; return Promise.resolve({ done: false, value: bytes }); }
          return Promise.resolve({ done: true as const, value: undefined });
        },
      }),
    },
  } as unknown as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  store.clear();
});

describe("isCloudApiActive", () => {
  it("is false by default (on-device only)", () => {
    expect(isCloudApiActive()).toBe(false);
  });

  it("is false when enabled but no key entered", () => {
    setCloudApiEnabled(true);
    expect(isCloudApiActive()).toBe(false);
  });

  it("is true only when enabled AND a key is set", () => {
    setCloudApiEnabled(true);
    setCloudApiKey("sk-test");
    expect(isCloudApiActive()).toBe(true);
    setCloudApiEnabled(false);
    expect(isCloudApiActive()).toBe(false);
  });
});

describe("createCloudBackend", () => {
  it("isReady() mirrors isCloudApiActive() live (toggle takes effect without re-registration)", () => {
    const b = createCloudBackend();
    expect(b.isReady()).toBe(false);
    setCloudApiEnabled(true);
    setCloudApiKey("sk-test");
    expect(b.isReady()).toBe(true);
    setCloudApiEnabled(false);
    expect(b.isReady()).toBe(false);
  });

  it("generate() posts the configured model + Bearer key + system/messages in OpenAI shape", async () => {
    setCloudApiEnabled(true);
    setCloudApiKey("sk-abc");
    setCloudApiUrl("https://example.test/v1/chat/completions");
    setCloudApiModel("my-model");
    fetchMock.mockResolvedValueOnce(makeSseResponse(["ok"]));

    const b = createCloudBackend();
    await b.generate({
      system: "You are Nila.",
      messages: [{ role: "user", content: "rough day" }],
      onToken: () => {},
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-abc");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("my-model");
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: "system", content: "You are Nila." },
      { role: "user", content: "rough day" },
    ]);
  });

  it("generate() streams SSE tokens to onToken and returns the full reply", async () => {
    setCloudApiEnabled(true);
    setCloudApiKey("sk-abc");
    fetchMock.mockResolvedValueOnce(makeSseResponse(["Hey, ", "I hear you."]));

    const b = createCloudBackend();
    const seen: string[] = [];
    const reply = await b.generate({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: (t) => seen.push(t),
    });

    expect(reply).toBe("Hey, I hear you.");
    expect(seen).toEqual(["Hey, ", "I hear you."]);
  });

  it("generate() rejects on a non-ok response so callers fall back gracefully", async () => {
    setCloudApiEnabled(true);
    setCloudApiKey("sk-abc");
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 } as Response);

    const b = createCloudBackend();
    await expect(
      b.generate({ system: "s", messages: [{ role: "user", content: "hi" }], onToken: () => {} }),
    ).rejects.toThrow(/401/);
  });

  it("generate() falls back to a non-streaming JSON body when there is no stream", async () => {
    setCloudApiEnabled(true);
    setCloudApiKey("sk-abc");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: null,
      json: () => Promise.resolve({ choices: [{ message: { content: "full reply" } }] }),
    } as unknown as Response);

    const b = createCloudBackend();
    const seen: string[] = [];
    const reply = await b.generate({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: (t) => seen.push(t),
    });
    expect(reply).toBe("full reply");
    expect(seen).toEqual(["full reply"]);
  });
});
