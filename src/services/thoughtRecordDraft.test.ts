import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { parseDraft, mapDraftToWizard, safeDraftThoughtRecord } from "./thoughtRecordDraft";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";

beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

beforeEach(() => {
  const scriptedReply = `SITUATION: Argument with a friend at lunch
AUTOMATIC THOUGHT: They hate me now
EMOTION: Anxious, intensity 70
EVIDENCE FOR:
- They walked away quickly
- They didn't text back
EVIDENCE AGAINST:
- They said "talk later"
- We've been friends for years`;
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

describe("parseDraft", () => {
  it("extracts all fields from valid model output", () => {
    const raw = `SITUATION: My manager criticized my presentation
AUTOMATIC THOUGHT: I'm a failure
EMOTION: Ashamed, intensity 8
EVIDENCE FOR:
- She said it needed more work
- I didn't prepare enough
EVIDENCE AGAINST:
- She also said parts were good
- It was my first time presenting`;
    const d = parseDraft(raw);
    expect(d.situation).toContain("manager");
    expect(d.automaticThought).toContain("failure");
    expect(d.emotion).toContain("Ashamed");
    expect(d.evidenceFor).toContain("more work");
    expect(d.evidenceAgainst).toContain("first time");
  });

  it("handles partial output gracefully", () => {
    const d = parseDraft("SITUATION: Something bad happened\nAUTOMATIC THOUGHT: I feel awful");
    expect(d.situation).toBe("Something bad happened");
    expect(d.automaticThought).toBe("I feel awful");
    expect(d.evidenceFor).toBe("");
    expect(d.evidenceAgainst).toBe("");
  });

  it("handles empty input", () => {
    const d = parseDraft("");
    expect(d.situation).toBe("");
    expect(d.automaticThought).toBe("");
  });

  it("extracts bullet lists", () => {
    const raw = `SITUATION: I sent an email with a typo
AUTOMATIC THOUGHT: Everyone will think I'm stupid
EMOTION: Embarrassed
EVIDENCE FOR:
- People might notice the typo
- I care about looking professional
EVIDENCE AGAINST:
- No one mentioned it
- It happens to everyone`;
    const d = parseDraft(raw);
    expect(d.evidenceFor).toContain("typo");
    expect(d.evidenceAgainst).toContain("everyone");
    expect(d.situation).toContain("email");
  });
});

describe("mapDraftToWizard", () => {
  it("maps draft fields to wizard state", () => {
    const draft = {
      situation: "Argued with friend about dinner",
      automaticThought: "They hate me",
      emotion: "Anxious, intensity 7",
      evidenceFor: "They raised their voice",
      evidenceAgainst: "They said it's fine",
    };
    const w = mapDraftToWizard(draft);
    expect(w.situation).toBe("Argued with friend about dinner");
    expect(w.feeling).toBe("Anxious, intensity 7");
    expect(w.automaticThought).toBe("They hate me");
  });
  it("extracts intensity number from emotion string", () => {
    const w = mapDraftToWizard({ situation: "x", automaticThought: "y", emotion: "Sad, intensity 80", evidenceFor: "", evidenceAgainst: "" });
    expect(w.initialIntensity).toBe(80);
  });
  it("defaults intensity to 50 when no number found", () => {
    const w = mapDraftToWizard({ situation: "x", automaticThought: "y", emotion: "Sad", evidenceFor: "", evidenceAgainst: "" });
    expect(w.initialIntensity).toBe(50);
  });
  it("empty draft yields empty wizard state with default intensity", () => {
    const w = mapDraftToWizard({ situation: "", automaticThought: "", emotion: "", evidenceFor: "", evidenceAgainst: "" });
    expect(w.situation).toBe("");
    expect(w.feeling).toBe("");
    expect(w.automaticThought).toBe("");
    expect(w.initialIntensity).toBe(50);
  });
});

describe("safeDraftThoughtRecord — §9 gate", () => {
  it("returns crisis, not a draft, for self-harm text", async () => {
    const r = await safeDraftThoughtRecord("I want to end my life");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("crisis");
  });

  it("returns empty for blank vent text", async () => {
    const r = await safeDraftThoughtRecord("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("empty");
  });

  it("returns a parsed draft for ordinary venting", async () => {
    const r = await safeDraftThoughtRecord("I had a fight with my friend and now I'm sure they hate me");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.situation).toContain("friend");
      expect(r.draft.automaticThought).toContain("hate");
    }
  });
});
