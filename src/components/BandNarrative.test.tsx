// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import BandNarrative from "./BandNarrative";
import { buildBandNarratives } from "../services/bandNarratives";

describe("buildBandNarratives", () => {
  const base = {
    activityMessage: "You've shown up 4 days running.",
    monthlyWord: "steady",
    behaviourCount: 2,
    proactiveCount: 1,
    moodSummary: "This week felt calmer than last.",
    signalCount: 3,
    episodeCount: 1,
    sessionCount: 5,
    lang: "en" as const,
  };

  it("composes a tracking summary mentioning the month word and notice count", () => {
    const n = buildBandNarratives(base);
    expect(n.tracking).toContain("steady");
    expect(n.tracking).toContain("3 patterns");
  });

  it("uses singular 'pattern' for exactly one notice", () => {
    const n = buildBandNarratives({ ...base, behaviourCount: 1, proactiveCount: 0 });
    expect(n.tracking).toContain("1 pattern");
    expect(n.tracking).not.toContain("1 patterns");
  });

  it("falls back to a reassuring line when no month word and no notices", () => {
    const n = buildBandNarratives({ ...base, monthlyWord: null, behaviourCount: 0, proactiveCount: 0 });
    expect(n.tracking).toContain("No new patterns flagged");
  });

  it("signals summary is pluralised by count", () => {
    expect(buildBandNarratives(base).signals).toContain("3 background signals");
    expect(buildBandNarratives({ ...base, signalCount: 1 }).signals).toContain("1 background signal");
    expect(buildBandNarratives({ ...base, signalCount: 0 }).signals).toContain("No background signals");
  });

  it("episodes summary pluralises episodes by count", () => {
    expect(buildBandNarratives(base).episodes).toContain("1 episode");
    expect(buildBandNarratives({ ...base, episodeCount: 2 }).episodes).toContain("2 episodes");
    expect(buildBandNarratives({ ...base, episodeCount: 0 }).episodes).toContain("No episodes recorded");
  });

  it("returns the activity message verbatim", () => {
    expect(buildBandNarratives(base).activity).toBe(base.activityMessage);
  });

  it("trends narrative echoes the mood summary", () => {
    expect(buildBandNarratives(base).trends).toBe(base.moodSummary);
  });

  it("localizes the count-based narratives for non-English locales", () => {
    const hi = buildBandNarratives({ ...base, lang: "hi" });
    // Hindi templates should be used, not the English sentence.
    expect(hi.signals).toContain("पृष्ठभूमि संकेत");
    expect(hi.signals).not.toContain("background signal");
    const ta = buildBandNarratives({ ...base, lang: "ta" });
    expect(ta.signals).toContain("பின்னணி சிக்னல்");
    const te = buildBandNarratives({ ...base, lang: "te" });
    expect(te.signals).toContain("బ్యాక్‌గ్రౌండ్ సిగ్నల్");
    // Count substitution must still work in any language.
    expect(buildBandNarratives({ ...base, lang: "hi", signalCount: 1 }).signals).toContain("1");
  });

  it("falls back to English when a locale is missing a key", () => {
    // 'xx' is not a real locale, so tn() falls back to the English template.
    const n = buildBandNarratives({ ...base, lang: "xx" as unknown as "en" });
    expect(n.signals).toContain("background signal");
  });
});

describe("BandNarrative", () => {
  it("renders the narrative text", () => {
    render(<BandNarrative text="A calm line." />);
    expect(screen.getByText("A calm line.")).toBeTruthy();
  });

  it("renders nothing when text is empty", () => {
    const { container } = render(<BandNarrative text="" />);
    expect(container.textContent).toBe("");
  });
});
