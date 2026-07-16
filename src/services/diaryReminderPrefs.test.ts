import { vi, describe, it, expect, beforeEach } from "vitest";
const ls = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (ls.has(k) ? ls.get(k)! : null),
  setItem: (k: string, v: string) => { ls.set(k, String(v)); },
  removeItem: (k: string) => { ls.delete(k); },
});
import { getDiaryReminderPrefs, setDiaryReminderPrefs } from "./diaryReminderPrefs";

beforeEach(() => ls.clear());

describe("diaryReminderPrefs", () => {
  it("defaults to disabled (opt-in, never nags a first-run user)", () => {
    expect(getDiaryReminderPrefs().enabled).toBe(false);
  });

  it("defaults time to 20:00", () => {
    expect(getDiaryReminderPrefs().time).toBe("20:00");
  });

  it("round-trips enabled + time", () => {
    setDiaryReminderPrefs({ enabled: true, time: "09:30" });
    expect(getDiaryReminderPrefs()).toEqual({ enabled: true, time: "09:30" });
  });

  it("partial updates preserve the other field", () => {
    setDiaryReminderPrefs({ time: "07:15" });
    setDiaryReminderPrefs({ enabled: true });
    expect(getDiaryReminderPrefs()).toEqual({ enabled: true, time: "07:15" });
  });
});
