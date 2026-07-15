import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("llama-cpp-capacitor", () => ({ initLlama: vi.fn() }));
vi.mock("./gemmaPrompt", () => ({ toGemmaPrompt: vi.fn(), windowMessages: vi.fn() }));
vi.mock("./qwenPrompt", () => ({ toQwenPrompt: vi.fn(), windowQwenMessages: vi.fn() }));

import { initLlama } from "llama-cpp-capacitor";
import { toGemmaPrompt, windowMessages } from "./gemmaPrompt";
import { toQwenPrompt, windowQwenMessages } from "./qwenPrompt";
import { createLlamaCppBackend } from "./llamaCppLlmAdapter";

function deferred<T = never>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function flush() { return new Promise((r) => setTimeout(r, 0)); }

const mockCompletion = vi.fn();
const mockStopCompletion = vi.fn();
const mockCtx = { completion: mockCompletion, stopCompletion: mockStopCompletion };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(initLlama).mockResolvedValue(mockCtx as any);
  vi.mocked(toGemmaPrompt).mockReturnValue(
    "<start_of_turn>user\nsystem\n\nhi<end_of_turn>\n<start_of_turn>model\n",
  );
  vi.mocked(toQwenPrompt).mockReturnValue(
    "<|im_start|>user\nsystem\n\nhi<|im_end|>\n<|im_start|>assistant\n",
  );
  vi.mocked(windowMessages).mockImplementation((msgs) => msgs);
  vi.mocked(windowQwenMessages).mockImplementation((msgs) => msgs);
  mockCompletion.mockResolvedValue({ text: "I hear you." });
});

describe("createLlamaCppBackend", () => {
  it("returns an object with id, isReady, loadState, warm, generate", () => {
    const b = createLlamaCppBackend();
    expect(b).toHaveProperty("id");
    expect(b).toHaveProperty("isReady");
    expect(b).toHaveProperty("loadState");
    expect(b).toHaveProperty("warm");
    expect(b).toHaveProperty("generate");
  });

  it("id includes the label parameter", () => {
    const b = createLlamaCppBackend("/sdcard/model.gguf", "my-label");
    expect(b.id).toContain("my-label");
  });

  it("isReady returns false before init completes", () => {
    const { promise } = deferred<any>();
    vi.mocked(initLlama).mockReturnValue(promise);

    const b = createLlamaCppBackend();
    expect(b.isReady()).toBe(false);
  });

  it("loadState returns loading initially, ready after successful init", async () => {
    const { promise, resolve } = deferred<any>();
    vi.mocked(initLlama).mockReturnValue(promise);

    const b = createLlamaCppBackend();
    expect(b.loadState!()).toBe("loading");

    resolve(mockCtx);
    await flush();
    expect(b.loadState!()).toBe("ready");
    expect(b.isReady()).toBe(true);
  });

  it("loadState returns error on init failure", async () => {
    const { promise, reject } = deferred<any>();
    vi.mocked(initLlama).mockReturnValue(promise);

    const b = createLlamaCppBackend();
    expect(b.loadState!()).toBe("loading");

    reject(new Error("OOM"));
    await flush();
    expect(b.loadState!()).toBe("error");
    expect(b.isReady()).toBe(false);
  });

  it("generate throws when context is not ready", async () => {
    const { promise } = deferred<any>();
    vi.mocked(initLlama).mockReturnValue(promise);

    const b = createLlamaCppBackend();
    await expect(
      b.generate({ system: "s", messages: [], onToken: () => {} }),
    ).rejects.toThrow("llama-cpp context not ready");
  });
});

describe("generate — turn-marker stripping (Qwen default)", () => {
  it("strips after <|im_end|>", async () => {
    mockCompletion.mockResolvedValue({ text: "I hear you.<|im_end|>What else?" });

    const b = createLlamaCppBackend();
    await flush();

    const reply = await b.generate({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });
    expect(reply).toBe("I hear you.");
  });

  it("strips after <|im_start|>", async () => {
    mockCompletion.mockResolvedValue({ text: "Hello.<|im_start|>user\nmore..." });

    const b = createLlamaCppBackend();
    await flush();

    const reply = await b.generate({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });
    expect(reply).toBe("Hello.");
  });
});

describe("generate — turn-marker stripping (Gemma, explicit format)", () => {
  it("strips after <end_of_turn> with gemma format", async () => {
    mockCompletion.mockResolvedValue({ text: "I hear you.<end_of_turn>What else?" });

    const b = createLlamaCppBackend("/sdcard/model.gguf", "gemma-test", "gemma");
    await flush();

    const reply = await b.generate({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      onToken: () => {},
    });
    expect(reply).toBe("I hear you.");
  });

  it("caps reply length (<=128 predicted tokens) so the 1B can't essay", async () => {
    const b = createLlamaCppBackend();
    await flush();
    await b.generate({ system: "s", messages: [{ role: "user", content: "hi" }], onToken: () => {} });
    const realCall = mockCompletion.mock.calls.find(([o]) => (o as { n_predict?: number }).n_predict !== 1);
    expect((realCall![0] as { n_predict: number }).n_predict).toBeLessThanOrEqual(128);
  });

  it("trims a length-cut reply back to the last complete sentence", async () => {
    mockCompletion.mockResolvedValue({ text: "I hear you. That sounds really" });
    const b = createLlamaCppBackend();
    await flush();
    const reply = await b.generate({ system: "s", messages: [{ role: "user", content: "hi" }], onToken: () => {} });
    expect(reply).toBe("I hear you.");
  });
});

it("generate applies anti-repetition sampling", async () => {
  const b = createLlamaCppBackend();
  await flush();

  await b.generate({
    system: "s",
    messages: [{ role: "user", content: "hi" }],
    onToken: () => {},
  });

  const realCall = mockCompletion.mock.calls.find(
    ([opts]) => (opts as { n_predict?: number }).n_predict !== 1,
  );
  expect(realCall).toBeTruthy();
  const opts = realCall![0] as Record<string, number>;
  expect(opts.penalty_repeat).toBeGreaterThan(1);
  expect(opts.penalty_last_n).toBeGreaterThanOrEqual(96);
  expect(opts.dry_multiplier).toBeGreaterThan(0);
});

it("non-streaming fallback feeds full text through onToken once when streaming never fires", async () => {
  mockCompletion.mockImplementation(
    () => Promise.resolve({ text: "Full reply." }),
  );

  const b = createLlamaCppBackend();
  await flush();

  const tokens: string[] = [];
  await b.generate({
    system: "s",
    messages: [{ role: "user", content: "hi" }],
    onToken: (t) => tokens.push(t),
  });

  expect(tokens).toEqual(["Full reply."]);
});

it("does NOT double-fire onToken when streaming already ran", async () => {
  mockCompletion.mockImplementation(
    (_opts: unknown, cb?: (data: { token: string }) => void) => {
      cb?.({ token: "Hello " });
      cb?.({ token: "world." });
      return Promise.resolve({ text: "Hello world." });
    },
  );

  const b = createLlamaCppBackend();
  await flush();

  const tokens: string[] = [];
  await b.generate({
    system: "s",
    messages: [{ role: "user", content: "hi" }],
    onToken: (t) => tokens.push(t),
  });

  expect(tokens).toEqual(["Hello ", "world."]);
});

it("warm calls completion with n_predict:1 and the rendered system prompt", async () => {
  vi.mocked(toQwenPrompt).mockReturnValue("rendered-sys");

  const b = createLlamaCppBackend();
  await flush();

  await b.warm!("You are Nila.");
  expect(toQwenPrompt).toHaveBeenCalledWith("You are Nila.", []);
  expect(mockCompletion).toHaveBeenCalledWith(
    expect.objectContaining({ prompt: "rendered-sys", n_predict: 1, temperature: 0 }),
  );
});

it("aborting generate via signal aborts the completion", async () => {
  let resolveCompletion!: (v: { text: string }) => void;
  mockStopCompletion.mockImplementation(() => {
    resolveCompletion?.({ text: "partial" });
  });
  mockCompletion.mockImplementation(
    () => new Promise((resolve) => { resolveCompletion = resolve; }),
  );

  const b = createLlamaCppBackend();
  await flush();

  const ctrl = new AbortController();
  const gen = b.generate({
    system: "s",
    messages: [{ role: "user", content: "hi" }],
    onToken: () => {},
    signal: ctrl.signal,
  });

  ctrl.abort();
  await expect(gen).rejects.toThrow("aborted");
});

it("initLlama receives cache_type_k and cache_type_v params", async () => {
  createLlamaCppBackend();
  await flush();
  expect(initLlama).toHaveBeenCalledWith(
    expect.objectContaining({ cache_type_k: "q4_0", cache_type_v: "q4_0" }),
  );
});
