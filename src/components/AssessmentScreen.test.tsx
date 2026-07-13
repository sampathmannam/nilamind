// @vitest-environment jsdom
// Reliable-change / deterioration nudge (2026-07-12 Wave 3, Group G). classifyChange() itself is
// covered by assessments.test.ts — this file exercises the wiring: the result screen must show a
// non-alarming, non-blocking nudge ONLY on a reliable (>=MCID) worsening, must stay silent on a
// first-ever assessment or a within-band change, and must hedge WHO-5's copy (no cited MCID) vs.
// PHQ-9/GAD-7's cited copy — never presenting WHO-5 with the same confidence.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import type { AssessmentEntry, InstrumentId } from "../services/assessments";

// jsdom doesn't implement matchMedia — AssessmentScreen's scrollToTop() reads it.
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import AssessmentScreen from "./AssessmentScreen";

afterEach(() => { cleanup(); store.clear(); });
const noop = () => {};

let seq = 0;
const entry = (instrument: InstrumentId, total: number, daysAgo: number): AssessmentEntry => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `a${seq++}`,
    date: d.toISOString().split("T")[0],
    timestamp: "10:00:00",
    instrument,
    responses: [],
    total,
    severity: "band",
    safetyFlag: false,
  };
};
const seed = (...es: AssessmentEntry[]) => store.set("nilamind_assessments", JSON.stringify(es));

/** Answers every item of the currently-running instrument in DOM order with the given per-item values. */
function answerAll(values: number[]): void {
  const items = document.querySelectorAll('[id^="assessment-item-"]');
  expect(items.length).toBe(values.length);
  items.forEach((item, idx) => {
    const buttons = item.querySelectorAll("button");
    fireEvent.click(buttons[values[idx]]);
  });
}

function startAndSubmit(instrumentId: InstrumentId, values: number[]): void {
  const startBtn = document.getElementById(`assessment-start-${instrumentId}`)!;
  fireEvent.click(startBtn);
  answerAll(values);
  fireEvent.click(document.getElementById("assessment-submit")!);
}

describe("AssessmentScreen — deterioration nudge (2026-07-12 Wave 3, Group G)", () => {
  it("shows no deterioration nudge on a first-ever assessment (no prior entry to compare against)", () => {
    render(<AssessmentScreen onActivateCrisis={noop} />);
    // PHQ-9: 9 items, answer all with 2 (total = 18) — no prior entry exists, so classifyChange has nothing to compare.
    startAndSubmit("PHQ-9", [2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(document.getElementById("assessment-deterioration-nudge")).toBeNull();
  });

  it("shows no nudge when the PHQ-9 change is within the ~5-point MCID band", () => {
    seed(entry("PHQ-9", 8, 10));
    render(<AssessmentScreen onActivateCrisis={noop} />);
    // total 10 -> delta +2 vs. prior 8, well inside the 5-point band.
    startAndSubmit("PHQ-9", [2, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(document.getElementById("assessment-deterioration-nudge")).toBeNull();
  });

  it("shows a cited, non-alarming nudge on reliable PHQ-9 worsening (>=5-point rise)", () => {
    seed(entry("PHQ-9", 2, 10));
    render(<AssessmentScreen onActivateCrisis={noop} />);
    // total 20 -> delta +18 vs. prior 2, well past the 5-point MCID.
    startAndSubmit("PHQ-9", [3, 3, 2, 2, 2, 2, 2, 2, 2]);
    const nudge = document.getElementById("assessment-deterioration-nudge");
    expect(nudge).not.toBeNull();
    expect(nudge!.textContent).toMatch(/reliable change/i);
    expect(nudge!.textContent).toMatch(/5-point/i);
    // never alarming/blocking language
    expect(nudge!.textContent).not.toMatch(/emergency/i);
  });

  it("shows a hedged nudge on reliable WHO-5 worsening, distinguishing it from the cited PHQ-9/GAD-7 copy", () => {
    seed(entry("WHO-5", 60, 10));
    render(<AssessmentScreen onActivateCrisis={noop} />);
    // WHO-5: 5 items, 0-5 each, x4 multiplier. All 1s -> raw 5 -> total 20. Delta -40 vs prior 60.
    startAndSubmit("WHO-5", [1, 1, 1, 1, 1]);
    const nudge = document.getElementById("assessment-deterioration-nudge");
    expect(nudge).not.toBeNull();
    expect(nudge!.textContent).toMatch(/well-established/i);
    expect(nudge!.textContent).not.toMatch(/^.*5-point.*$/); // shouldn't borrow the PHQ-9 cited wording
  });
});
