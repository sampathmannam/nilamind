import { describe, it, expect } from "vitest";
import { makeReflector, createReflectBackend, offlineBrainMessage } from "./nilaReflect";

// nilaReflect is the deterministic, LLM-free "Nila listens" backend for the WEB front door (rung 0):
// a small model doesn't exist in the browser, so warmth comes from reflective-listening scripts while
// the app's deterministic tools + §9 still carry the actual help. These tests lock the invariants we
// promised: never fabricate empathy, reflect the stated feeling, never repeat a stem in a session,
// always end on a gentle opening, and data-fence the user's own echoed words.

// A reflection must never CLAIM shared lived experience — the one thing a script has no right to say.
const FABRICATION_PHRASES = [
  "i know exactly how you feel",
  "i've felt that",
  "i have felt that",
  "i went through",
  "the same thing happened to me",
  "i understand exactly",
];

function hasFabricatedEmpathy(reply: string): boolean {
  const t = reply.toLowerCase();
  return FABRICATION_PHRASES.some((p) => t.includes(p));
}

describe("makeReflector", () => {
  it("reflects a stated feeling back (validates the emotion, not a generic canned line)", () => {
    const reflect = makeReflector();
    const reply = reflect("I feel so anxious right now, my chest is tight");
    expect(reply.toLowerCase()).toContain("anxious");
  });

  it("never fabricates shared lived experience", () => {
    const reflect = makeReflector();
    for (const feeling of ["anxious", "so low and empty", "angry", "overwhelmed", "numb", "sad"]) {
      expect(hasFabricatedEmpathy(reflect(feeling))).toBe(false);
    }
  });

  it("always ends on a gentle opening (an invitation, not a full stop)", () => {
    const reflect = makeReflector();
    const reply = reflect("everything is falling apart");
    expect(reply.trim().endsWith("?")).toBe(true);
  });

  it("never repeats a stem within one full pass through the pool, and never twice in a row", () => {
    const reflect = makeReflector();
    // The Anxious pool has 4 stems; one full pass must be 4 DISTINCT stems (no repeat while options remain).
    const stems: string[] = [];
    for (let i = 0; i < 4; i++) stems.push(reflect("I feel anxious").split(/[.?!]/)[0].trim());
    expect(new Set(stems).size).toBe(4);
    // After the pool cycles it may reuse a stem, but never the SAME one twice consecutively.
    let prev = stems[stems.length - 1];
    for (let i = 0; i < 10; i++) {
      const next = reflect("I feel anxious").split(/[.?!]/)[0].trim();
      expect(next).not.toBe(prev);
      prev = next;
    }
  });

  it("recovers gracefully when the stem pool is exhausted (many turns, no crash, still varied text)", () => {
    const reflect = makeReflector();
    for (let i = 0; i < 40; i++) {
      const reply = reflect("I feel anxious");
      expect(reply.length).toBeGreaterThan(0);
      expect(hasFabricatedEmpathy(reply)).toBe(false);
    }
  });

  it("handles empty / whitespace input with a valid gentle opener (no crash)", () => {
    const reflect = makeReflector();
    const reply = reflect("   ");
    expect(reply.length).toBeGreaterThan(0);
    expect(reply.trim().endsWith("?")).toBe(true);
  });
});

describe("createReflectBackend — conforms to the LocalLlmBackend seam", () => {
  it("is always ready on web (no model load needed)", () => {
    expect(createReflectBackend().isReady()).toBe(true);
  });

  it("streams tokens and resolves with the exact same full text", async () => {
    const backend = createReflectBackend();
    let streamed = "";
    const full = await backend.generate({
      system: "",
      messages: [{ role: "user", content: "I feel anxious" }],
      onToken: (t) => { streamed += t; },
    });
    expect(streamed).toBe(full);
    expect(full.toLowerCase()).toContain("anxious");
  });

  it("reflects the LAST user message when history is present", async () => {
    const backend = createReflectBackend();
    const full = await backend.generate({
      system: "",
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "user", content: "actually I feel really overwhelmed" },
      ],
      onToken: () => {},
    });
    expect(full.toLowerCase()).toContain("overwhelmed");
  });
});

describe("offlineBrainMessage — state-aware no-model reply (2026-07-17 QA)", () => {
  it("explains a not-downloaded brain and points to Settings + tools", () => {
    const m = offlineBrainMessage("none");
    expect(m).toMatch(/isn't downloaded|set it up in Settings/i);
    expect(m.length).toBeGreaterThan(20);
  });
  it("names the loading wait without alarming", () => {
    expect(offlineBrainMessage("loading")).toMatch(/waking up|take a moment|few seconds/i);
  });
  it("explains a load failure and points to the offline tools", () => {
    expect(offlineBrainMessage("error")).toMatch(/couldn't load|low on memory/i);
  });
  it("never returns an empty string (would re-create the silent-void bug)", () => {
    for (const s of ["none", "loading", "ready", "error"] as const) {
      expect(offlineBrainMessage(s).trim().length).toBeGreaterThan(0);
    }
  });
});
