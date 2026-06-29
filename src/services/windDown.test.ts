import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  SLEEP_TIPS,
  nightlyTip,
  WINDDOWN_STEPS,
  getWindDownReminder,
  setWindDownReminder,
  checkWindDownText,
} from "./windDown";

describe("SLEEP_TIPS corpus", () => {
  it("every tip has non-empty id, text, basis (cited)", () => {
    expect(SLEEP_TIPS.length).toBeGreaterThanOrEqual(5);
    for (const t of SLEEP_TIPS) {
      expect(t.id).toBeTruthy();
      expect(t.text.length).toBeGreaterThan(10);
      expect(t.basis.length).toBeGreaterThan(3);
    }
  });
  it("is invitation-framed, not prescriptive medical orders", () => {
    for (const t of SLEEP_TIPS) {
      expect(t.text.toLowerCase()).not.toMatch(/\byou must\b|\bavoid\b|\bdon't drink\b/);
    }
  });
});

describe("nightlyTip", () => {
  it("is deterministic for a given date and varies across days", () => {
    const a = nightlyTip(new Date(2026, 0, 1));
    const a2 = nightlyTip(new Date(2026, 0, 1));
    expect(a.id).toBe(a2.id);
    const ids = new Set([0, 1, 2, 3, 4, 5, 6].map((d) => nightlyTip(new Date(2026, 0, 1 + d)).id));
    expect(ids.size).toBeGreaterThan(1);
  });
});

describe("WINDDOWN_STEPS", () => {
  it("has the three core steps; worry step is skippable", () => {
    const ids = WINDDOWN_STEPS.map((s) => s.id);
    expect(ids).toContain("park");
    expect(ids).toContain("settle");
    expect(ids).toContain("close");
    expect(WINDDOWN_STEPS.find((s) => s.id === "park")?.skippable).toBe(true);
  });
});

describe("getWindDownReminder / setWindDownReminder", () => {
  beforeEach(() =>
    vi.stubGlobal(
      "localStorage",
      (() => {
        let s: Record<string, string> = {};
        return {
          getItem: (k: string) => s[k] ?? null,
          setItem: (k: string, v: string) => {
            s[k] = v;
          },
          removeItem: (k: string) => {
            delete s[k];
          },
        };
      })(),
    ),
  );
  it("defaults to OFF", () => {
    expect(getWindDownReminder().enabled).toBe(false);
  });
  it("round-trips enabled + time", () => {
    setWindDownReminder({ enabled: true, time: "22:30" });
    const r = getWindDownReminder();
    expect(r.enabled).toBe(true);
    expect(r.time).toBe("22:30");
  });
});

describe("checkWindDownText (worry-park crisis gate)", () => {
  it("true for crisis content, false for ordinary worry / empty", () => {
    expect(checkWindDownText("I want to kill myself")).toBe(true);
    expect(checkWindDownText("I'm stressed about my meeting tomorrow")).toBe(false);
    expect(checkWindDownText("")).toBe(false);
  });
});
