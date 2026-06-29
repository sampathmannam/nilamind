import { describe, it, expect, beforeEach } from "vitest"; // beforeEach used by Task 4's appended block
import { vi } from "vitest";
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({ secureLocal: {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
} }));
const lstore = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (lstore.has(k) ? lstore.get(k)! : null),
  setItem: (k: string, v: string) => { lstore.set(k, String(v)); },
  removeItem: (k: string) => { lstore.delete(k); },
});
import {
  recordDetectionPass, topFireableSignal, surfaceOpener, acknowledgeInflection,
  dismissLoggedSignal, latestInflectionsForLog, shouldSurfaceToday,
} from "./nilaInflection";
import { detectInflections, emotionDistress, mean, sampleStdev } from "./nilaInflection";
import type { CheckInEntry } from "../types";
import type { AssessmentEntry } from "./assessments";

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const dayAgo = (n: number) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-n); return ymd(d); };
const TODAY = dayAgo(0);
const ci = (date: string, emotion: string, intensity: number): CheckInEntry =>
  ({ id: "c"+date+emotion+intensity, date, timestamp: "t", emotion, intensity, context: "" });
const as = (id: string, date: string, instrument: AssessmentEntry["instrument"], total: number): AssessmentEntry =>
  ({ id, date, timestamp: "t", instrument, responses: [], total, severity: "x", safetyFlag: false });

describe("emotionDistress (valence-aware)", () => {
  it("negative emotion → its intensity", () => { expect(emotionDistress("Low (Nila)", 8)).toBe(8); });
  it("positive/neutral → 0 even at high intensity", () => {
    expect(emotionDistress("Calm (Nila)", 9)).toBe(0);
    expect(emotionDistress("Okay", 7)).toBe(0);
  });
  it("unknown → 0", () => { expect(emotionDistress("Sparkly", 9)).toBe(0); });
  it("MIXED / dysphoric activation → distress, not misread as 'fine'", () => {
    // high-energy agitated states (manic energy + distress) must register as distress so the trajectory
    // never emits an 'improvement' opener to a mixed-state user (red-panel clinical finding).
    for (const e of ["wired", "racing thoughts", "agitated", "restless", "manic", "keyed up", "on edge", "out of control"]) {
      expect(emotionDistress(e, 8)).toBe(8);
    }
    // but genuine euthymic high energy stays 0 — we don't pathologise feeling good
    expect(emotionDistress("Calm (Nila)", 10)).toBe(0);
    expect(emotionDistress("Okay", 9)).toBe(0);
  });
});

describe("mean / sampleStdev", () => {
  it("mean", () => { expect(mean([2,4,6])).toBe(4); expect(mean([])).toBe(0); });
  it("sample stdev (n-1), 0 for n<2", () => { expect(sampleStdev([2,4,6])).toBeCloseTo(2,5); expect(sampleStdev([5])).toBe(0); });
});

describe("detectInflections — screening_change", () => {
  it("fires deterioration at ≥ reliable-change threshold across ≥7 days", () => {
    const a = [as("a","2026-05-01","PHQ-9",6), as("b","2026-05-20","PHQ-9",12)];
    const sigs = detectInflections([], a, TODAY).filter(s => s.kind === "screening_change");
    expect(sigs).toHaveLength(1);
    expect(sigs[0].direction).toBe("deterioration");
    expect(sigs[0].id).toBe("screening_change|PHQ-9|deterioration|b");
  });
  it("does NOT fire below threshold", () => {
    const a = [as("a","2026-05-01","PHQ-9",6), as("b","2026-05-20","PHQ-9",10)]; // +4 < 5
    expect(detectInflections([], a, TODAY).filter(s=>s.kind==="screening_change")).toHaveLength(0);
  });
  it("does NOT fire on same-day retakes (interval < 7d)", () => {
    const a = [as("a","2026-05-20","PHQ-9",6), as("b","2026-05-20","PHQ-9",12)];
    expect(detectInflections([], a, TODAY).filter(s=>s.kind==="screening_change")).toHaveLength(0);
  });
  it("GAD-7 basis carries the less-replicated caveat", () => {
    const a = [as("a","2026-05-01","GAD-7",4), as("b","2026-05-20","GAD-7",9)]; // +5 ≥ 4
    const s = detectInflections([], a, TODAY).find(x=>x.metric==="GAD-7")!;
    expect(s.basis.toLowerCase()).toContain("less-replicated");
  });
});

describe("detectInflections — mood_trend (valence + persistence)", () => {
  const baseline = Array.from({length: 12}, (_, i) => ci(dayAgo(12 + i), "Calm (Nila)", 6)); // all distress 0
  it("a strong-POSITIVE recent run never fires deterioration", () => {
    const recent = Array.from({length: 7}, (_, i) => ci(dayAgo(i), "Calm (Nila)", 9)); // distress 0
    expect(detectInflections([...baseline, ...recent], [], TODAY).filter(s=>s.kind==="mood_trend")).toHaveLength(0);
  });
  it("a sustained NEGATIVE recent run fires deterioration vs a calm baseline", () => {
    const recent = Array.from({length: 7}, (_, i) => ci(dayAgo(i), "Low (Nila)", 7)); // distress 7
    const s = detectInflections([...baseline, ...recent], [], TODAY).find(x=>x.kind==="mood_trend");
    expect(s?.direction).toBe("deterioration");
  });
  it("no fire on sparse data (recent < 5 or baseline < 10)", () => {
    const recent = Array.from({length: 3}, (_, i) => ci(dayAgo(i), "Low (Nila)", 9));
    expect(detectInflections([...baseline, ...recent], [], TODAY).filter(s=>s.kind==="mood_trend")).toHaveLength(0);
  });
  it("improvement: negative baseline → calm recent", () => {
    const negBase = Array.from({length: 12}, (_, i) => ci(dayAgo(12 + i), "Low (Nila)", 7));
    const calmRecent = Array.from({length: 7}, (_, i) => ci(dayAgo(i), "Calm (Nila)", 8));
    const s = detectInflections([...negBase, ...calmRecent], [], TODAY).find(x=>x.kind==="mood_trend");
    expect(s?.direction).toBe("improvement");
  });
});

describe("store + orchestration", () => {
  beforeEach(() => { store.clear(); lstore.clear(); });
  const seedPHQ = () => store.set("nilamind_assessments", JSON.stringify([
    as("a","2026-05-01","PHQ-9",6), as("b", dayAgo(2), "PHQ-9", 12),
  ]));

  it("recordDetectionPass logs a fired signal once/day and dedups by id", () => {
    seedPHQ();
    recordDetectionPass();
    recordDetectionPass(); // throttled same day
    const log = latestInflectionsForLog();
    expect(log.filter(l => l.kind === "screening_change")).toHaveLength(1);
  });

  it("topFireableSignal surfaces a recent screening rise, then cooldown suppresses it", () => {
    seedPHQ();
    const sig = topFireableSignal();
    expect(sig?.kind).toBe("screening_change");
    acknowledgeInflection(sig!.id, "dismissed");
    expect(topFireableSignal()).toBeNull(); // 14-day cooldown
  });

  it("topFireableSignal does NOT surface a STALE screening (>21d old) but it stays in the log", () => {
    store.set("nilamind_assessments", JSON.stringify([
      as("a","2026-01-01","PHQ-9",6), as("b","2026-01-20","PHQ-9",12), // last >21d ago
    ]));
    expect(topFireableSignal()).toBeNull();
    recordDetectionPass();
    expect(latestInflectionsForLog().some(l => l.kind === "screening_change")).toBe(true);
  });

  it("surfaceOpener marks the day and a second call returns null (one/day cap)", () => {
    seedPHQ();
    expect(surfaceOpener()).not.toBeNull();
    expect(shouldSurfaceToday()).toBe(false);
    expect(surfaceOpener()).toBeNull();
  });

  it("dismissLoggedSignal removes a row from the log view + cools it down", () => {
    seedPHQ();
    recordDetectionPass();
    const id = latestInflectionsForLog()[0].id;
    dismissLoggedSignal(id);
    expect(latestInflectionsForLog().some(l => l.id === id)).toBe(false);
  });
});
