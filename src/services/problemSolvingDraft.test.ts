import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { draftProblemStatement, safeDraftProblem } from "./problemSolvingDraft";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";

const SOLVABLE = JSON.stringify({ solvable: true, problem: "You need to decide whether to keep commuting 2 hours a day or move closer to work." });
let scriptedReply = SOLVABLE;

beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

beforeEach(() => {
  scriptedReply = SOLVABLE;
  const backend: LocalLlmBackend = {
    id: "fake",
    isReady: () => true,
    generate: async ({ onToken }) => {
      for (const t of scriptedReply.split("")) onToken(t);
      return scriptedReply;
    },
  };
  registerLocalLlmBackend(backend);
});

describe("draftProblemStatement", () => {
  it("returns a cleaned one-line problem statement", async () => {
    const p = await draftProblemStatement("i keep going back and forth about the commute, it's exhausting");
    expect(p).toContain("commuting");
  });

  it("returns null when the model marks it not solvable (a grief / feeling, not a problem)", async () => {
    scriptedReply = JSON.stringify({ solvable: false, problem: "" });
    expect(await draftProblemStatement("i just miss my grandmother so much")).toBeNull();
  });

  it("returns null when solvable but the problem string is empty", async () => {
    scriptedReply = JSON.stringify({ solvable: true, problem: "" });
    expect(await draftProblemStatement("hmm")).toBeNull();
  });

  it("strips surrounding quotes and clamps length", async () => {
    scriptedReply = JSON.stringify({ solvable: true, problem: `"${"x".repeat(300)}"` });
    const p = await draftProblemStatement("some long worry");
    expect(p!.startsWith('"')).toBe(false);
    expect(p!.length).toBeLessThanOrEqual(200);
  });
});

describe("safeDraftProblem (§9-gated)", () => {
  it("drafts a problem for an ordinary worry", async () => {
    const r = await safeDraftProblem("i can't figure out the commute situation and it's stressing me out");
    expect(r).toEqual({ ok: true, problem: expect.stringContaining("commuting") });
  });

  it("never reaches the model for a crisis disclosure — returns a crisis flag", async () => {
    const spy = { called: false };
    registerLocalLlmBackend({
      id: "spy", isReady: () => true,
      generate: async ({ onToken }) => { spy.called = true; onToken("x"); return "x"; },
    });
    const r = await safeDraftProblem("i want to kill myself");
    expect(r).toEqual({ ok: false, reason: "crisis" });
    expect(spy.called).toBe(false); // §9 gate fired before the model
  });

  it("returns empty for a blank worry", async () => {
    expect(await safeDraftProblem("   ")).toEqual({ ok: false, reason: "empty" });
  });

  it("returns empty when there's no solvable problem", async () => {
    scriptedReply = JSON.stringify({ solvable: false, problem: "" });
    expect(await safeDraftProblem("everything just feels grey lately")).toEqual({ ok: false, reason: "empty" });
  });
});
