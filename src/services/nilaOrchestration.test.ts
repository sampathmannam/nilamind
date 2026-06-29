import { describe, it, expect, beforeEach, vi } from "vitest";

// Control screening cadence: latestFor returns a fake "entry" tag, daysSince maps it to a number/null.
let phqDays: number | null = null;
let gadDays: number | null = null;
vi.mock("./assessments", () => ({
  latestFor: (id: string) => (id === "PHQ-9" ? (phqDays === null ? null : { _id: "phq" }) : (gadDays === null ? null : { _id: "gad" })),
  daysSince: (e: any) => (e == null ? null : (e._id === "phq" ? phqDays : gadDays)),
}));

import { cardsForCheckin, type NilaCard } from "./nilaOrchestration";
import type { CheckInEntry } from "../types";

beforeEach(() => { phqDays = null; gadDays = null; });

const mk = (emotion: string, intensity: number, date = "2026-06-21"): CheckInEntry =>
  ({ id: "ch_" + Math.random(), date, timestamp: "t", emotion, intensity, context: "x" });

const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };

const kinds = (cs: NilaCard[]) => cs.map((c) => c.kind);

describe("intensity gate", () => {
  it("intensity 7 yields grounding + episode cards", () => {
    const cs = cardsForCheckin(mk("Okay (Nila)", 7), []);
    expect(cs.some((c) => c.kind === "grounding")).toBe(true);
    expect(cs.some((c) => c.kind === "episode")).toBe(true);
  });
  it("intensity 9 yields grounding + episode cards", () => {
    const cs = cardsForCheckin(mk("Okay (Nila)", 9), []);
    expect(cs.some((c) => c.kind === "grounding")).toBe(true);
    expect(cs.some((c) => c.kind === "episode")).toBe(true);
  });
  it("intensity 5 yields NO grounding/episode cards", () => {
    const cs = cardsForCheckin(mk("Okay (Nila)", 5), []);
    expect(cs.some((c) => c.kind === "grounding")).toBe(false);
    expect(cs.some((c) => c.kind === "episode")).toBe(false);
  });
});

describe("skill card via skillForEmotion (suffix-stripped)", () => {
  it("Anxious maps to a skill card (tipp)", () => {
    const cs = cardsForCheckin(mk("Anxious (Nila)", 5), []);
    const skill = cs.find((c) => c.kind === "skill");
    expect(skill).toBeTruthy();
    expect(skill!.skillId).toBe("tipp");
  });
  it("Calm yields NO skill card", () => {
    expect(cardsForCheckin(mk("Calm (Nila)", 3), []).some((c) => c.kind === "skill")).toBe(false);
  });
  it("Okay yields NO skill card", () => {
    expect(cardsForCheckin(mk("Okay (Nila)", 3), []).some((c) => c.kind === "skill")).toBe(false);
  });
});

describe("PHQ-9 cadence", () => {
  const sustainedLow = () => [mk("Low (Nila)", 6, today()), mk("Sad (Nila)", 5, daysAgo(1)), mk("Down (Nila)", 7, daysAgo(3))];

  it("offers PHQ-9 when never screened (daysSince === null)", () => {
    phqDays = null;
    const cs = cardsForCheckin(mk("Low (Nila)", 6), sustainedLow());
    const s = cs.find((c) => c.kind === "screening" && c.instrument === "PHQ-9");
    expect(s).toBeTruthy();
  });
  it("does NOT offer PHQ-9 when screened 10 days ago (<= 14)", () => {
    phqDays = 10;
    const cs = cardsForCheckin(mk("Low (Nila)", 6), sustainedLow());
    expect(cs.some((c) => c.kind === "screening" && c.instrument === "PHQ-9")).toBe(false);
  });
  it("does NOT offer PHQ-9 at the 14-day boundary (d === 14 is not > 14)", () => {
    phqDays = 14;
    const cs = cardsForCheckin(mk("Low (Nila)", 6), sustainedLow());
    expect(cs.some((c) => c.kind === "screening" && c.instrument === "PHQ-9")).toBe(false);
  });
  it("offers PHQ-9 again past 14 days (d === 15)", () => {
    phqDays = 15;
    const cs = cardsForCheckin(mk("Low (Nila)", 6), sustainedLow());
    expect(cs.some((c) => c.kind === "screening" && c.instrument === "PHQ-9")).toBe(true);
  });
  it("does NOT offer PHQ-9 with only 2 qualifying recents", () => {
    phqDays = null;
    const recent = [mk("Low (Nila)", 6, today()), mk("Sad (Nila)", 6, daysAgo(1)), mk("Calm (Nila)", 2, daysAgo(2))];
    expect(cardsForCheckin(mk("Low (Nila)", 6), recent).some((c) => c.kind === "screening")).toBe(false);
  });
  it("does NOT count a low entry with intensity < 5", () => {
    phqDays = null;
    const recent = [mk("Low (Nila)", 6, today()), mk("Sad (Nila)", 6, daysAgo(1)), mk("Down (Nila)", 4, daysAgo(2))];
    expect(cardsForCheckin(mk("Low (Nila)", 6), recent).some((c) => c.kind === "screening" && c.instrument === "PHQ-9")).toBe(false);
  });
  it("does NOT count entries older than 14 days", () => {
    phqDays = null;
    const recent = [mk("Low (Nila)", 6, today()), mk("Sad (Nila)", 6, daysAgo(2)), mk("Down (Nila)", 6, daysAgo(20))];
    expect(cardsForCheckin(mk("Low (Nila)", 6), recent).some((c) => c.kind === "screening" && c.instrument === "PHQ-9")).toBe(false);
  });
});

describe("GAD-7 cadence", () => {
  const sustainedAnx = () => [mk("Anxious (Nila)", 6, today()), mk("Overwhelmed (Nila)", 5, daysAgo(1)), mk("Anxious (Nila)", 7, daysAgo(2))];
  it("offers GAD-7 when never screened and anxiety is sustained", () => {
    gadDays = null;
    const cs = cardsForCheckin(mk("Anxious (Nila)", 6), sustainedAnx());
    expect(cs.some((c) => c.kind === "screening" && c.instrument === "GAD-7")).toBe(true);
  });
  it("does NOT offer GAD-7 at the 14-day boundary", () => {
    gadDays = 14;
    const cs = cardsForCheckin(mk("Anxious (Nila)", 6), sustainedAnx());
    expect(cs.some((c) => c.kind === "screening" && c.instrument === "GAD-7")).toBe(false);
  });
});

describe("only last 5 recents are considered", () => {
  it("ignores qualifying entries beyond the most recent 5", () => {
    phqDays = null;
    // 5 non-qualifying recent + 3 older qualifying => predicate false
    const recent = [
      mk("Calm (Nila)", 2, today()), mk("Calm (Nila)", 2, daysAgo(1)), mk("Okay (Nila)", 2, daysAgo(2)),
      mk("Okay (Nila)", 2, daysAgo(3)), mk("Calm (Nila)", 2, daysAgo(4)),
      mk("Low (Nila)", 6, daysAgo(5)), mk("Sad (Nila)", 6, daysAgo(6)), mk("Down (Nila)", 6, daysAgo(7)),
    ];
    expect(cardsForCheckin(mk("Low (Nila)", 6), recent).some((c) => c.kind === "screening")).toBe(false);
  });
});

describe("order-independence: recent window selects by date not array position", () => {
  it("produces identical cards regardless of input array order (newest-first vs oldest-first)", () => {
    phqDays = null;
    // 5 most-recent entries are LOW/SAD (qualify); 3 older entries are CALM (do not qualify).
    // In storage order (oldest-first) the qualifying entries appear at the END of the array.
    // slice(0,5) would have picked the 3 old calm entries + 2 of the calm entries, failing the predicate.
    // Date-sort selection must pick the 5 newest regardless of position.
    const oldNonQualifying = [
      mk("Calm (Nila)", 2, daysAgo(10)),
      mk("Calm (Nila)", 2, daysAgo(9)),
      mk("Okay (Nila)", 2, daysAgo(8)),
    ];
    const recentQualifying = [
      mk("Low (Nila)", 6, daysAgo(4)),
      mk("Sad (Nila)", 7, daysAgo(3)),
      mk("Down (Nila)", 5, daysAgo(2)),
      mk("Low (Nila)", 6, daysAgo(1)),
      mk("Sad (Nila)", 6, today()),
    ];
    // Storage order: oldest first (non-qualifying at start, qualifying at end)
    const storageOrder = [...oldNonQualifying, ...recentQualifying];
    // Reversed: newest first (qualifying at start)
    const reversedOrder = [...storageOrder].reverse();

    const entry = mk("Low (Nila)", 6);
    const cardsStorage = cardsForCheckin(entry, storageOrder);
    const cardsReversed = cardsForCheckin(entry, reversedOrder);

    // Both must find the PHQ-9 screening (3+ of last 5 are low/sad with intensity>=5)
    expect(cardsStorage.some((c) => c.kind === "screening" && c.instrument === "PHQ-9")).toBe(true);
    expect(cardsReversed.some((c) => c.kind === "screening" && c.instrument === "PHQ-9")).toBe(true);
    // And the full card lists must be identical in kind+instrument
    expect(kinds(cardsStorage)).toEqual(kinds(cardsReversed));
  });
});
