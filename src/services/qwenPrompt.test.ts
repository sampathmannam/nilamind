import { describe, it, expect } from "vitest";
import { toQwenMessages, toQwenPrompt, windowQwenMessages } from "./qwenPrompt";

const SYS = "You are Nila, a wellness companion.";

describe("toQwenMessages — system role is separate (Qwen supports it natively)", () => {
  it("seeded greeting first → system + assistant + user", () => {
    const out = toQwenMessages(SYS, [
      { role: "assistant", content: "Hey, I'm Nila." },
      { role: "user", content: "i feel anxious" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["system", "assistant", "user"]);
    expect(out[0].content).toBe(SYS);
    expect(out[1].content).toBe("Hey, I'm Nila.");
    expect(out[2].content).toBe("i feel anxious");
  });

  it("conversation starting with a user turn → system + user", () => {
    const out = toQwenMessages(SYS, [{ role: "user", content: "hello" }]);
    expect(out.map((m) => m.role)).toEqual(["system", "user"]);
    expect(out[1].content).toBe("hello");
  });

  it("empty history → system only", () => {
    const out = toQwenMessages(SYS, []);
    expect(out.map((m) => m.role)).toEqual(["system"]);
    expect(out[0].content).toBe(SYS);
  });
});

describe("toQwenMessages — coalesce non-alternating turns", () => {
  it("two consecutive assistant turns merge into one", () => {
    const out = toQwenMessages(SYS, [
      { role: "assistant", content: "opener" },
      { role: "assistant", content: "follow" },
      { role: "user", content: "hi" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["system", "assistant", "user"]);
    expect(out[1].content).toBe("opener\n\nfollow");
  });

  it("two consecutive user turns merge", () => {
    const out = toQwenMessages(SYS, [
      { role: "user", content: "first" },
      { role: "user", content: "second" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["system", "user"]);
    expect(out[1].content).toBe("first\n\nsecond");
  });
});

describe("toQwenPrompt — raw Qwen string using <|im_start|> / <|im_end|> tokens", () => {
  const prompt = toQwenPrompt(SYS, [
    { role: "assistant", content: "Hey." },
    { role: "user", content: "hi" },
  ]);

  it("uses <|im_start|> tokens with correct roles", () => {
    expect(prompt).toContain("<|im_start|>system\n");
    expect(prompt).toContain("<|im_start|>user\n");
    expect(prompt).toContain("<|im_start|>assistant\n");
    expect(prompt).toContain("<|im_end|>");
  });

  it("ends with the assistant generation cue", () => {
    expect(prompt.endsWith("<|im_start|>assistant\n")).toBe(true);
  });

  it("is a string, guarding against reverting to the crashing messages[] path", () => {
    expect(typeof prompt).toBe("string");
  });
});

describe("windowQwenMessages — cap the transcript to fit n_ctx=2048", () => {
  it("returns a short history unchanged", () => {
    const m = [
      { role: "assistant" as const, content: "hi" },
      { role: "user" as const, content: "hello" },
    ];
    expect(windowQwenMessages(m, 5000)).toBe(m);
  });

  it("keeps the first greeting + most-recent turns within budget", () => {
    const big = "x".repeat(2000);
    const m = [
      { role: "assistant" as const, content: "GREETING" },
      { role: "user" as const, content: big + "1" },
      { role: "assistant" as const, content: big + "2" },
      { role: "user" as const, content: big + "3" },
      { role: "assistant" as const, content: big + "4" },
    ];
    const out = windowQwenMessages(m, 5000);
    expect(out.length).toBeLessThan(m.length);
    expect(out[0].content).toBe("GREETING");
    expect(out[out.length - 1].content).toBe(big + "4");
  });
});
