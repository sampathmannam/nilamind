import { describe, it, expect } from "vitest";
import { toGemmaMessages, toGemmaPrompt, windowMessages } from "./gemmaPrompt";

const SYS = "You are Nila.";

describe("toGemmaMessages — fold system into a leading user turn (Gemma has no system role)", () => {
  it("seeded greeting first → prepends a synthetic user turn carrying the system", () => {
    const out = toGemmaMessages(SYS, [
      { role: "assistant", content: "Hey, I'm Nila." },
      { role: "user", content: "i feel anxious" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "user"]); // valid Gemma alternation
    expect(out[0].content).toBe(`${SYS}\n\nHi`);
    expect(out[1].content).toBe("Hey, I'm Nila.");
    expect(out[2].content).toBe("i feel anxious");
  });

  it("conversation starting with a user turn → folds system into that turn", () => {
    const out = toGemmaMessages(SYS, [{ role: "user", content: "hello" }]);
    expect(out).toEqual([{ role: "user", content: `${SYS}\n\nhello` }]);
  });

  it("empty history → system-only user turn", () => {
    expect(toGemmaMessages(SYS, [])).toEqual([{ role: "user", content: SYS }]);
  });
});

describe("toGemmaMessages — coalesce non-alternating turns (the store doesn't guarantee alternation)", () => {
  it("two consecutive assistant turns (opener + tapped reply) merge into one model turn", () => {
    const out = toGemmaMessages(SYS, [
      { role: "assistant", content: "opener" },
      { role: "assistant", content: "follow" },
      { role: "user", content: "hi" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["user", "assistant", "user"]); // legal Gemma alternation
    expect(out[1].content).toBe("opener\n\nfollow");
  });

  it("two consecutive user turns (after synthetic episode turns are stripped) merge", () => {
    const out = toGemmaMessages(SYS, [
      { role: "user", content: "first" },
      { role: "user", content: "second" },
    ]);
    expect(out.map((m) => m.role)).toEqual(["user"]);
    expect(out[0].content).toBe(`${SYS}\n\nfirst\n\nsecond`);
  });
});

describe("toGemmaPrompt — raw Gemma string (NOT messages[]; dodges the binding's jinja crash)", () => {
  const prompt = toGemmaPrompt(SYS, [
    { role: "assistant", content: "Hey." },
    { role: "user", content: "hi" },
  ]);

  it("uses real Gemma turn tokens and the model role name", () => {
    expect(prompt).toContain("<start_of_turn>user\n");
    expect(prompt).toContain("<start_of_turn>model\n"); // assistant -> "model"
    expect(prompt).toContain("<end_of_turn>");
  });

  it("ends with the model cue so the model generates Nila's reply", () => {
    expect(prompt.endsWith("<start_of_turn>model\n")).toBe(true);
  });

  it("does NOT include a <bos> (the native tokenizer adds it; add_special=true)", () => {
    expect(prompt).not.toContain("<bos>");
  });

  it("is a string, guarding against reverting to the crashing messages[] path", () => {
    expect(typeof prompt).toBe("string");
  });
});

describe("windowMessages — cap the transcript so the prompt never overflows n_ctx", () => {
  it("returns a short history unchanged", () => {
    const m = [{ role: "assistant" as const, content: "hi" }, { role: "user" as const, content: "hello" }];
    expect(windowMessages(m, 5000)).toBe(m);
  });

  it("keeps the greeting + the most-recent turns within budget, dropping the oldest", () => {
    const big = "x".repeat(2000);
    const m = [
      { role: "assistant" as const, content: "GREETING" },
      { role: "user" as const, content: big + "1" },
      { role: "assistant" as const, content: big + "2" },
      { role: "user" as const, content: big + "3" },
      { role: "assistant" as const, content: big + "4" },
    ];
    const out = windowMessages(m, 5000);
    expect(out.length).toBeLessThan(m.length); // some old turns dropped
    expect(out[0].content).toBe("GREETING"); // greeting primer kept
    expect(out[out.length - 1].content).toBe(big + "4"); // latest turn kept
  });
});
