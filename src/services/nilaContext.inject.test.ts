import { vi, describe, it, expect, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  SENSITIVE_KEYS: [],
  flush: () => {},
}));

import { buildPersonalContext } from "./nilaContext";

beforeEach(() => store.clear());

describe("buildPersonalContext + durable insights", () => {
  it("returns '' when there is nothing at all", () => {
    expect(buildPersonalContext()).toBe("");
  });
  it("includes the insights sub-section under the umbrella header", () => {
    store.set("nilamind_nila_insights", JSON.stringify([
      { id: "a", kind: "pattern", text: "Evenings are hard for them.", date: "2026-06-20", source: "reflection" },
    ]));
    const ctx = buildPersonalContext();
    expect(ctx).toContain("WHAT YOU ALREADY KNOW ABOUT THEM");
    expect(ctx).toContain("Over time");
    expect(ctx).toContain("- Evenings are hard for them.");
  });
  it("includes energy trend statement when check-ins have energy data", () => {
    const today = new Date();
    const checkins = [5, 4, 3, 2, 1].map((daysAgo, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return { date: d.toISOString().split("T")[0], emotion: i < 3 ? "Low" : "Calm", intensity: i < 3 ? 7 : 3, energy: 4 - i, context: "" };
    });
    store.set("nilamind_checkins", JSON.stringify(checkins));
    const ctx = buildPersonalContext();
    expect(ctx).toMatch(/energy.*(rising|falling|stable|trend|chang)/i);
  });

  it("includes prevailing state quadrant when all entries share one quadrant", () => {
    const today = new Date();
    // All check-ins are "Sluggish" (high distress + low energy)
    const checkins = [4, 3, 2, 1].map((daysAgo) => {
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      return { date: d.toISOString().split("T")[0], emotion: "Low", intensity: 8, energy: 1, context: "" };
    });
    store.set("nilamind_checkins", JSON.stringify(checkins));
    const ctx = buildPersonalContext();
    expect(ctx).toMatch(/\bSluggish\b/);
  });

  it("orders insights before recent check-ins", () => {
    const today = new Date().toISOString().split("T")[0];
    store.set("nilamind_nila_insights", JSON.stringify([
      { id: "a", kind: "pattern", text: "INSIGHT_LINE", date: "2026-06-20", source: "reflection" },
    ]));
    store.set("nilamind_checkins", JSON.stringify([{ date: today, emotion: "Calm", intensity: 3, context: "" }]));
    const ctx = buildPersonalContext();
    expect(ctx).toContain("INSIGHT_LINE"); // genuinely red without injection (indexOf would be -1)
    expect(ctx.indexOf("INSIGHT_LINE")).toBeLessThan(ctx.indexOf("From their check-ins"));
  });
});
