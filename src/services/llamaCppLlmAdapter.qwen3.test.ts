import { describe, it, expect, vi, beforeEach } from "vitest";

// Qwen3 format + research-grounded sampling profiles + schema-constrained generation.
// Uses the REAL qwenPrompt builders (pure functions) — only the native binding is mocked —
// so this also covers the builder→adapter integration.

vi.mock("llama-cpp-capacitor", () => ({ initLlama: vi.fn() }));

import { initLlama } from "llama-cpp-capacitor";
import { createLlamaCppBackend } from "./llamaCppLlmAdapter";

function flush() { return new Promise((r) => setTimeout(r, 0)); }

const mockCompletion = vi.fn();
const mockStopCompletion = vi.fn();
const mockCtx = { completion: mockCompletion, stopCompletion: mockStopCompletion };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(initLlama).mockResolvedValue(mockCtx as any);
  mockCompletion.mockResolvedValue({ text: "I hear you." });
});

/** The real (non-warm) completion call: n_predict > 1. */
function realCall(): Record<string, unknown> {
  const call = mockCompletion.mock.calls.find(([o]) => (o as { n_predict?: number }).n_predict !== 1);
  expect(call).toBeTruthy();
  return call![0] as Record<string, unknown>;
}

async function generateWith(format: "qwen" | "qwen3", extra: Record<string, unknown> = {}) {
  const b = createLlamaCppBackend("/sdcard/m.gguf", "t", format as any);
  await flush();
  return b.generate({
    system: "You are Nila.",
    messages: [{ role: "user", content: "rough day" }],
    onToken: () => {},
    ...(extra as object),
  } as any);
}

describe("sampling profiles per prompt format", () => {
  it("qwen (Qwen2.5) keeps temp 0.6 and adds the min-p floor (min_p 0.05)", async () => {
    await generateWith("qwen");
    const p = realCall();
    expect(p.temperature).toBe(0.6);
    expect(p.min_p).toBe(0.05);
  });

  it("qwen3 uses the official non-thinking profile: temp 0.7, top_p 0.8, top_k 20, min_p 0", async () => {
    await generateWith("qwen3");
    const p = realCall();
    expect(p.temperature).toBe(0.7);
    expect(p.top_p).toBe(0.8);
    expect(p.top_k).toBe(20);
    expect(p.min_p).toBe(0);
  });

  it("qwen3 sets a presence penalty against quantized-small-model loops", async () => {
    await generateWith("qwen3");
    const p = realCall();
    expect(p.penalty_present).toBeGreaterThanOrEqual(0.5);
    expect(p.penalty_present).toBeLessThanOrEqual(2);
  });
});

describe("qwen3 prompt + output handling", () => {
  it("sends a prompt ending in the empty-think assistant prefill", async () => {
    await generateWith("qwen3");
    const p = realCall();
    expect(String(p.prompt).endsWith("<|im_start|>assistant\n<think>\n\n</think>\n\n")).toBe(true);
  });

  it("strips a leaked think block from the reply", async () => {
    mockCompletion.mockResolvedValue({ text: "<think>\nbe gentle\n</think>\n\nThat sounds heavy." });
    const reply = await generateWith("qwen3");
    expect(reply).toBe("That sounds heavy.");
  });

  it("drops an unclosed think block entirely (fail-closed, never leaks reasoning)", async () => {
    mockCompletion.mockResolvedValue({ text: "<think>\nthe user might be" });
    const reply = await generateWith("qwen3");
    expect(reply).toBe("");
  });
});

describe("schema-constrained generation (jsonSchema)", () => {
  const schema = {
    type: "array",
    items: {
      type: "object",
      properties: { kind: { enum: ["pattern"] }, text: { type: "string" } },
      required: ["kind", "text"],
    },
  };

  it("passes the schema to the binding as a json_schema string", async () => {
    await generateWith("qwen", { jsonSchema: schema });
    const p = realCall();
    expect(typeof p.json_schema).toBe("string");
    expect(JSON.parse(p.json_schema as string)).toEqual(schema);
  });

  it("returns the raw structured text untouched (no sentence-trim / label-strip mangling)", async () => {
    const json = '[{"kind":"pattern","text":"Evenings are hard"}]';
    mockCompletion.mockResolvedValue({ text: json });
    const reply = await generateWith("qwen", { jsonSchema: schema });
    expect(reply).toBe(json);
  });

  it("omits json_schema entirely for normal chat generation", async () => {
    await generateWith("qwen");
    const p = realCall();
    expect(p.json_schema).toBeUndefined();
  });
});
