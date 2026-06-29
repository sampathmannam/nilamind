import { describe, it, expect } from "vitest";
import { classify } from "./agent";

describe("agent NAV routes after redesign", () => {
  it("routes behavioural-activation phrasing to values_to_action", () => {
    const i = classify("open behavioural activation");
    expect(i).toEqual({ kind: "navigate", view: "values_to_action", label: expect.any(String) });
  });
  it("routes values phrasing to values_to_action", () => {
    const i = classify("show my values");
    expect(i).toEqual({ kind: "navigate", view: "values_to_action", label: expect.any(String) });
  });
  it("repoints 'talk to nila' / voice check-in to the nila tab", () => {
    const i = classify("talk to nila");
    expect(i).toEqual({ kind: "navigate", view: "nila", label: expect.any(String) });
  });
  it("still routes screenings to the assessment view", () => {
    expect(classify("open a screening")).toEqual({ kind: "navigate", view: "assessment", label: expect.any(String) });
  });
  it("never emits the removed legacy views", () => {
    const probes = ["open behavioural activation", "show my values", "talk to nila", "voice check-in", "nila check-in"];
    for (const p of probes) {
      const i = classify(p);
      if (i && i.kind === "navigate") {
        expect(["behavioural_activation", "values_compass", "nila_voice"]).not.toContain(i.view);
      }
    }
  });
});

describe("talk-to over-match regression guard", () => {
  it("'talk to nila' routes to nila view", () => {
    const i = classify("talk to nila");
    expect(i).toEqual({ kind: "navigate", view: "nila", label: expect.any(String) });
  });

  it("generic 'talk to someone about diary' does NOT navigate to diary", () => {
    const i = classify("I want to talk to someone about my diary");
    expect(i?.kind === "navigate" && i.view === "diary").toBe(false);
  });

  it("generic 'talk to therapist about breathing' does NOT navigate to breathing", () => {
    const i = classify("talk to my therapist about breathing");
    expect(i?.kind === "navigate" && i.view === "breathing").toBe(false);
  });

  it("generic 'talk to a friend about check-in' does NOT navigate to checkin", () => {
    const i = classify("I need to talk to a friend about my check-in");
    expect(i?.kind === "navigate" && i.view === "checkin").toBe(false);
  });

  it("nila check-in phrases still route to nila", () => {
    const phrases = ["voice check-in", "check in with nila", "nila check-in"];
    for (const p of phrases) {
      const i = classify("open " + p);
      expect(i).toEqual({ kind: "navigate", view: "nila", label: expect.any(String) });
    }
  });
});
