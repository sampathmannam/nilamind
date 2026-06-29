import { vi, describe, it, expect, beforeEach } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
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
