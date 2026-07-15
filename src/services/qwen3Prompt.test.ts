import { describe, it, expect } from "vitest";
import { toQwen3Prompt, stripThinkBlocks } from "./qwenPrompt";

// Qwen3 non-thinking mode, raw-prompt path. Per the official Qwen3 model card, the hard switch
// (enable_thinking=false) renders the assistant turn PREFILLED with an empty <think></think> block —
// the model then answers directly without spending tokens on hidden reasoning. We mirror that in the
// raw ChatML builder, and defensively strip any think block the model still emits.

describe("toQwen3Prompt", () => {
  it("renders ChatML with a system turn and an empty-think assistant prefill", () => {
    const p = toQwen3Prompt("You are Nila.", [{ role: "user", content: "rough day" }]);
    expect(p).toBe(
      "<|im_start|>system\nYou are Nila.<|im_end|>\n" +
        "<|im_start|>user\nrough day<|im_end|>\n" +
        "<|im_start|>assistant\n<think>\n\n</think>\n\n",
    );
  });

  it("keeps prior assistant turns intact (no think prefill inside history)", () => {
    const p = toQwen3Prompt("s", [
      { role: "user", content: "hi" },
      { role: "assistant", content: "Hey, I'm here." },
      { role: "user", content: "thanks" },
    ]);
    expect(p).toContain("<|im_start|>assistant\nHey, I'm here.<|im_end|>\n");
    // exactly ONE think prefill — at the trailing generation cue
    expect(p.match(/<think>/g)).toHaveLength(1);
    expect(p.endsWith("<|im_start|>assistant\n<think>\n\n</think>\n\n")).toBe(true);
  });
});

describe("stripThinkBlocks", () => {
  it("removes a closed think block and returns the visible reply", () => {
    expect(stripThinkBlocks("<think>\nthey seem sad, be gentle\n</think>\n\nI hear you.")).toBe("I hear you.");
  });

  it("removes an empty think block", () => {
    expect(stripThinkBlocks("<think>\n\n</think>\n\nThat sounds hard.")).toBe("That sounds hard.");
  });

  it("returns plain text unchanged", () => {
    expect(stripThinkBlocks("I hear you — that sounds heavy.")).toBe("I hear you — that sounds heavy.");
  });

  it("fail-closed: an UNCLOSED think block is dropped entirely (never leak hidden reasoning as the reply)", () => {
    expect(stripThinkBlocks("Sure. <think>\nthe user might be in crisis, I should")).toBe("Sure.");
    expect(stripThinkBlocks("<think>\nhalf a thought")).toBe("");
  });
});
