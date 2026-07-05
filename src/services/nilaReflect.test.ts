import { describe, it, expect } from "vitest";
import { makeReflector, sanitizeEcho, createReflectBackend } from "./nilaReflect";

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

describe("sanitizeEcho — data-fence the user's own words before echoing them", () => {
  it("collapses newlines so a multi-line injection can't restructure the reply", () => {
    expect(sanitizeEcho("line one\nline two\r\nthree")).not.toContain("\n");
  });

  it("strips URLs so an echoed link can never become a live target", () => {
    const out = sanitizeEcho("check https://evil.example.com/x now");
    expect(out.toLowerCase()).not.toContain("http");
  });

  it("caps length so a huge paste can't dominate the reflection", () => {
    const out = sanitizeEcho("a".repeat(500));
    expect(out.length).toBeLessThanOrEqual(120);
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
