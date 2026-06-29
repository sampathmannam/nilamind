import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── fetch mock ──────────────────────────────────────────────────────────────
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { createOllamaBackend } from "./ollamaLlmAdapter";

// Build a fake Ollama streaming response from an array of token strings.
function makeStreamResponse(tokens: string[]): Response {
  const lines = tokens.map((t) => JSON.stringify({ message: { content: t }, done: false }));
  lines.push(JSON.stringify({ message: { content: "" }, done: true }));
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

function flushMicrotasks() { return new Promise((r) => setTimeout(r, 0)); }

beforeEach(() => { fetchMock.mockReset(); });

describe("createOllamaBackend", () => {

  it("has an id matching the model name", () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const b = createOllamaBackend("qwen2.5:7b");
    expect(b.id).toBe("ollama/qwen2.5:7b");
  });

  it("isReady() starts false; becomes true once the probe resolves ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const b = createOllamaBackend();
    expect(b.isReady()).toBe(false); // probe is async — not done yet
    await flushMicrotasks();
    expect(b.isReady()).toBe(true);
  });

  it("isReady() stays false when Ollama is offline", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const b = createOllamaBackend();
    await flushMicrotasks();
    expect(b.isReady()).toBe(false);
  });

  it("isReady() stays false when probe returns non-ok", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    const b = createOllamaBackend();
    await flushMicrotasks();
    expect(b.isReady()).toBe(false);
  });

  it("generate() streams tokens to onToken and returns the full reply", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true }); // probe
    fetchMock.mockResolvedValueOnce(makeStreamResponse(["Hey, ", "I hear you."]));

    const b = createOllamaBackend();
    const seen: string[] = [];
    const reply = await b.generate({
      system: "You are Nila.",
      messages: [{ role: "user", content: "rough day" }],
      onToken: (t) => seen.push(t),
    });

    expect(reply).toBe("Hey, I hear you.");
    expect(seen).toEqual(["Hey, ", "I hear you."]);
  });

  it("generate() sends system + messages to Ollama in the correct shape", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true }); // probe
    fetchMock.mockResolvedValueOnce(makeStreamResponse(["ok"]));

    const b = createOllamaBackend("qwen2.5:7b", "http://localhost:11434");
    await b.generate({
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });

    const [url, opts] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("http://localhost:11434/api/chat");
    const body = JSON.parse(opts.body as string);
    expect(body.model).toBe("qwen2.5:7b");
    expect(body.stream).toBe(true);
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(body.messages[1]).toEqual({ role: "user", content: "hi" });
  });

  it("generate() throws when Ollama returns a non-ok status", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true }); // probe
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, body: null });

    const b = createOllamaBackend();
    await expect(
      b.generate({ system: "s", messages: [{ role: "user", content: "x" }], onToken: () => {} })
    ).rejects.toThrow("Ollama 500");
  });

  it("generate() respects AbortSignal and passes it to fetch", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true }); // probe
    fetchMock.mockResolvedValueOnce(makeStreamResponse(["x"]));

    const ctrl = new AbortController();
    const b = createOllamaBackend();
    await b.generate({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
      signal: ctrl.signal,
    });

    const [, opts] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(opts.signal).toBe(ctrl.signal);
  });
});
