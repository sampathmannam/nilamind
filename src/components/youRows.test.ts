import { describe, it, expect } from "vitest";
import { YOU_ROW_IDS, buildYouGroups } from "./youRows";

describe("You hub rows (redesign §2)", () => {
  it("includes the manage rows", () => {
    for (const id of ["about_nila", "dashboard", "your_data", "nila_memory", "settings", "caregiver"]) expect(YOU_ROW_IDS).toContain(id);
  });
  it("includes the Resources group rows", () => {
    for (const id of ["thought_record", "values_to_action", "learn", "insights"]) {
      expect(YOU_ROW_IDS).toContain(id);
    }
  });
  it("uses the new merged values_to_action route (not the legacy ones)", () => {
    expect(YOU_ROW_IDS).toContain("values_to_action");
    expect(YOU_ROW_IDS).not.toContain("behavioural_activation");
    expect(YOU_ROW_IDS).not.toContain("values_compass");
  });
  it("includes the What Nila remembers row", () => {
    expect(YOU_ROW_IDS).toContain("nila_memory");
  });
  it("renders exactly the expected hub rows in order (catches accidental add/remove/reorder)", () => {
    const rendered = buildYouGroups().flatMap((g) => g.rows.map((r) => r.id));
    expect(rendered).toEqual([
      "about_nila", "dashboard", "your_data", "nila_memory", "settings", "caregiver",
      "thought_record", "values_to_action", "learn", "insights",
    ]);
    expect(YOU_ROW_IDS).toEqual(rendered);
  });
  it("buildYouGroups exposes the Manage and Resources groups in order", () => {
    expect(buildYouGroups().map((g) => g.title)).toEqual(["Manage", "Resources"]);
  });
});
