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

  it("keeps thought-record, self-compassion, medication, and dashboard reachable from quick actions", () => {
    const ids = ACTIONS.map((a) => a.id);
    for (const required of ["thought_record", "self_compassion", "medication", "dashboard"]) {
      expect(ids).toContain(required);
    }
  });
});
