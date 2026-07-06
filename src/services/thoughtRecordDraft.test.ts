import { describe, it, expect } from "vitest";
import { parseDraft, mapDraftToWizard } from "./thoughtRecordDraft";

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
