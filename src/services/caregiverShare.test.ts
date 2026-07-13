import { describe, it, expect, vi, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
  appendToSecureArray: <T>(key: string, item: T) => {
    const arr: T[] = store.has(key) ? JSON.parse(store.get(key)!) : [];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
    return arr;
  },
}));

vi.mock("./moodHistory", () => ({ loadMoodHistory: vi.fn(() => []) }));

import { loadMoodHistory } from "./moodHistory";
import { buildCaregiverSnapshot, caregiverSummaryText } from "./caregiverShare";

beforeEach(() => store.clear());

describe("caregiverShare", () => {
  it("builds a non-diagnostic snapshot with crisis lines", () => {
    (loadMoodHistory as any).mockReturnValue([
      { date: "2026-07-01", intensity: 3 },
      { date: "2026-07-02", intensity: 4 },
      { date: "2026-07-03", intensity: 2 },
    ]);
    const s = buildCaregiverSnapshot();
    expect(s.headline).toContain("NilaMind");
    expect(s.lines.length).toBeGreaterThan(0);
    expect(s.lines.join(" ")).not.toMatch(/diagnos|treat|therapy|disorder/i);
    expect(s.crisisLines.length).toBeGreaterThan(0);
  });

  it("produces copyable plain text", () => {
    (loadMoodHistory as any).mockReturnValue([]);
    const txt = caregiverSummaryText();
    expect(txt).toContain("NilaMind");
    expect(txt).toContain("•");
  });

  it("gates mood block on shareCategories.mood", () => {
    (loadMoodHistory as any).mockReturnValue([
      { date: "2026-07-01", intensity: 3 },
      { date: "2026-07-02", intensity: 4 },
      { date: "2026-07-03", intensity: 2 },
    ]);
    const withMood = buildCaregiverSnapshot({ shareCategories: { mood: true, phase: false, sleep: false, medication: false, wellbeing: false, checkins: false }, autoAlert: { enabled: false, thresholdDays: 3, minIntensity: 5 } });
    expect(withMood.lines.join(" ").toLowerCase()).toMatch(/distress|lower|higher|mixed/);

    const withoutMood = buildCaregiverSnapshot({ shareCategories: { mood: false, phase: false, sleep: false, medication: false, wellbeing: false, checkins: false }, autoAlert: { enabled: false, thresholdDays: 3, minIntensity: 5 } });
    expect(withoutMood.lines.join(" ").toLowerCase()).not.toMatch(/distress|lower|higher|mixed/);
  });

  it("always includes the streak line and disclaimer", () => {
    (loadMoodHistory as any).mockReturnValue([]);
    const s = buildCaregiverSnapshot();
    const joined = s.lines.join(" ");
    expect(joined).toMatch(/day|one day at a time/);
    expect(joined).toContain("wellness companion");
  });

  it("includes the crisis lines header in plain text", () => {
    (loadMoodHistory as any).mockReturnValue([]);
    const txt = caregiverSummaryText();
    expect(txt).toContain("If they're in crisis");
  });
});
