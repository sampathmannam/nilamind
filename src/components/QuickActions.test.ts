import { describe, it, expect } from "vitest";
import { ACTIONS } from "./QuickActions";

describe("QuickActions action list", () => {
  it("surfaces the unified Learn screen, not the legacy Skills row", () => {
    const ids = ACTIONS.map((a) => a.id);
    expect(ids).toContain("learn");
    expect(ids).not.toContain("skill");
  });

  it("has unique ids", () => {
    const ids = ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps thought-record, self-compassion, medication, dashboard, and values-to-action reachable from quick actions", () => {
    const ids = ACTIONS.map((a) => a.id);
    for (const required of ["thought_record", "self_compassion", "medication", "dashboard", "values_to_action"]) {
      expect(ids).toContain(required);
    }
  });

  it("shows at least the values-to-action action in day mode", () => {
    const ids = ACTIONS.filter((a) => a.modes.includes("day")).map((a) => a.id);
    expect(ids).toContain("values_to_action");
  });
});
