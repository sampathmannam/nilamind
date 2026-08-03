import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

import { streamOpenAiChat, type OpenAiChatStreamOpts } from "./openAiChatStream";

beforeEach(() => fetchSpy.mockReset());
afterEach(() => vi.restoreAllMocks());

function makeOpts(overrides: Partial<OpenAiChatStreamOpts> = {}): OpenAiChatStreamOpts {
  return {
    apiUrl: "https://api.example.com/chat",
    apiKey: "test-key",
    model: "gpt-4",
    system: "You are a test assistant.",
    messages: [{ role: "user", content: "hello" }],
    onToken: vi.fn(),
    errorLabel: "TestError",
    ...overrides,
  };
}

describe("streamOpenAiChat", () => {
  it("is a function", () => {
    expect(typeof streamOpenAiChat).toBe("function");
  });

  it("returns a Promise", () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: null,
      json: async () => ({ choices: [{ message: { content: "hi" } }] }),
    });
    const result = streamOpenAiChat(makeOpts());
    expect(result).toBeInstanceOf(Promise);
  });

  it("resolves with the streamed text from SSE", async () => {
    const chunks = [
      "data: {\"choices\":[{\"delta\":{\"content\":\"Hello\"}}]}\n",
      "data: {\"choices\":[{\"delta\":{\"content\":\" world\"}}]}\n",
      "data: [DONE]\n",
    ];
    let chunkIdx = 0;
    const reader = {
      read: async () => {
        if (chunkIdx < chunks.length) {
          return { done: false, value: new TextEncoder().encode(chunks[chunkIdx++]) };
        }
        return { done: true, value: undefined };
      },
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });

    const onToken = vi.fn();
    const result = await streamOpenAiChat(makeOpts({ onToken }));
    expect(result).toBe("Hello world");
    expect(onToken).toHaveBeenCalledWith("Hello");
    expect(onToken).toHaveBeenCalledWith(" world");
  });

  it("resolves with non-streaming JSON fallback when body is null", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: null,
      json: async () => ({ choices: [{ message: { content: "fallback reply" } }] }),
    });
    const onToken = vi.fn();
    const result = await streamOpenAiChat(makeOpts({ onToken }));
    expect(result).toBe("fallback reply");
    expect(onToken).toHaveBeenCalledWith("fallback reply");
  });

  it("throws on non-ok response", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    });
    await expect(streamOpenAiChat(makeOpts())).rejects.toThrow("TestError 401");
  });

  it("sends correct headers and body", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      body: null,
      json: async () => ({ choices: [{ message: { content: "" } }] }),
    });
    await streamOpenAiChat(makeOpts());
    expect(fetchSpy).toHaveBeenCalledWith("https://api.example.com/chat", expect.objectContaining({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-key",
      },
    }));
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.model).toBe("gpt-4");
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
    expect(body.stream).toBe(true);
  });
});
