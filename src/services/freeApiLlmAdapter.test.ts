import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./openAiChatStream", () => ({
  streamOpenAiChat: vi.fn(async () => "mocked response"),
}));

import { createFreeApiBackend } from "./freeApiLlmAdapter";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createFreeApiBackend", () => {
  it("returns an object with an id string", () => {
    const backend = createFreeApiBackend("https://api.example.com", "test-key");
    expect(typeof backend.id).toBe("string");
    expect(backend.id).toBe("free-api-llm");
  });

  it("isReady() returns true when an apiKey is provided", () => {
    const backend = createFreeApiBackend("https://api.example.com", "test-key");
    expect(backend.isReady()).toBe(true);
  });

  it("isReady() returns false when apiKey is empty", () => {
    const backend = createFreeApiBackend("https://api.example.com", "");
    expect(backend.isReady()).toBe(false);
  });

  it("generate is a function", () => {
    const backend = createFreeApiBackend("https://api.example.com", "test-key");
    expect(typeof backend.generate).toBe("function");
  });

  it("generate returns a string", async () => {
    const backend = createFreeApiBackend("https://api.example.com", "test-key");
    const result = await backend.generate({
      system: "You are Nila.",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });
    expect(typeof result).toBe("string");
    expect(result).toBe("mocked response");
  });
});
