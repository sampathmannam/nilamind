import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { parseSafetyPlanDraft, draftSafetyPlan, safeDraftSafetyPlan } from "./safetyPlanDraft";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";

const GOOD = {
  warningSigns: "staying up scrolling, snapping at people",
  internalCoping: "cold water on my face, box breathing",
  socialDistractors: "walking to the park",
  safeEnvironment: "put my meds in another room",
};
let scriptedReply = JSON.stringify(GOOD);

beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

beforeEach(() => {
  scriptedReply = JSON.stringify(GOOD);
  const backend: LocalLlmBackend = {
    id: "fake",
    isReady: () => true,
    generate: async ({ onToken }) => { for (const t of scriptedReply.split("")) onToken(t); return scriptedReply; },
  };
  registerLocalLlmBackend(backend);
});

describe("parseSafetyPlanDraft (4 coping fields only; never contacts/hotlines)", () => {
  it("keeps the four coping fields and ignores any contact/hotline keys the model emits", () => {
    const f = parseSafetyPlanDraft({ ...GOOD, trustedPeople: "Maya +91 99999 99999", professionals: "988" });
    expect(f).toEqual(GOOD);
    expect(f).not.toHaveProperty("trustedPeople");
    expect(f).not.toHaveProperty("professionals");
  });

  it("returns null when every field is empty", () => {
    expect(parseSafetyPlanDraft({ warningSigns: "", internalCoping: "", socialDistractors: "", safeEnvironment: "" })).toBeNull();
  });

  it("FAILS CLOSED when the drafted content itself trips the crisis scanner", () => {
    const f = parseSafetyPlanDraft({ ...GOOD, internalCoping: "i want to kill myself" });
    expect(f).toBeNull();
  });

  it("clamps overly long field content", () => {
    const f = parseSafetyPlanDraft({ ...GOOD, warningSigns: "x".repeat(2000) });
    expect(f!.warningSigns.length).toBeLessThanOrEqual(500);
  });
});

describe("draftSafetyPlan", () => {
  it("drafts the coping fields from the model", async () => {
    const f = await draftSafetyPlan("i've been up all night and snapping at everyone, cold water helps");
    expect(f).toEqual(GOOD);
  });
  it("returns null on non-JSON", async () => {
    scriptedReply = "not json";
    expect(await draftSafetyPlan("whatever")).toBeNull();
  });
});

describe("safeDraftSafetyPlan (§9-gated input)", () => {
  it("drafts for a reflective coping conversation", async () => {
    const r = await safeDraftSafetyPlan("when things get bad i stop sleeping; splashing cold water helps me");
    expect(r).toEqual({ ok: true, draft: GOOD });
  });

  it("never reaches the model for an active-crisis disclosure", async () => {
    const spy = { called: false };
    registerLocalLlmBackend({ id: "spy", isReady: () => true, generate: async ({ onToken }) => { spy.called = true; onToken("x"); return "x"; } });
    const r = await safeDraftSafetyPlan("i want to kill myself tonight");
    expect(r).toEqual({ ok: false, reason: "crisis" });
    expect(spy.called).toBe(false);
  });

  it("returns empty for a blank input", async () => {
    expect(await safeDraftSafetyPlan("  ")).toEqual({ ok: false, reason: "empty" });
  });
});
