import { vi, describe, it, expect, beforeEach } from "vitest";
const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({ secureLocal: {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
} }));
import { buildPersonalContext } from "./nilaContext";

beforeEach(() => store.clear());
describe("latestScreeningBand reads the real AssessmentEntry shape", () => {
  it("a real PHQ-9 entry (instrument/total/severity) yields a non-empty screening line", () => {
    store.set("nilamind_assessments", JSON.stringify([
      { id: "a", date: "2026-06-01", timestamp: "t", instrument: "PHQ-9", responses: [], total: 12, severity: "Moderate", safetyFlag: false },
    ]));
    const ctx = buildPersonalContext();
    expect(ctx.toLowerCase()).toContain("screening");
  });
  it("ignores non-PHQ/GAD instruments", () => {
    store.set("nilamind_assessments", JSON.stringify([
      { id: "w", date: "2026-06-01", timestamp: "t", instrument: "WHO-5", responses: [], total: 40, severity: "x", safetyFlag: false },
    ]));
    // WHO-5 alone produces no screening band line; buildPersonalContext returns "" when nothing else is present.
    expect(buildPersonalContext()).toBe("");
  });
});
