import { describe, it, expect } from "vitest";
import { YOU_ROW_IDS, buildYouGroups } from "./youRows";

describe("You hub rows (redesign §2)", () => {
  it("includes the manage rows", () => {
    for (const id of ["dashboard", "your_data", "settings"]) expect(YOU_ROW_IDS).toContain(id);
  });
  it("includes the Resources group rows", () => {
    for (const id of ["thought_record", "self_compassion", "values_to_action", "skills"]) {
      expect(YOU_ROW_IDS).toContain(id);
    }
  });
  it("includes the Understand explainer row (previously drifted: rendered by YouScreen but absent here)", () => {
    expect(YOU_ROW_IDS).toContain("understand");
  });
  it("uses the new merged values_to_action route (not the legacy ones)", () => {
    expect(YOU_ROW_IDS).toContain("values_to_action");
    expect(YOU_ROW_IDS).not.toContain("behavioural_activation");
    expect(YOU_ROW_IDS).not.toContain("values_compass");
  });
  it("includes the why row (binding override: WhyScreen stays reachable from You hub)", () => {
    expect(YOU_ROW_IDS).toContain("why");
  });
  it("includes the What Nila remembers row", () => {
    expect(YOU_ROW_IDS).toContain("nila_memory");
  });
  it("renders exactly the expected hub rows in order (catches accidental add/remove/reorder)", () => {
    // Pinned to an explicit list (NOT re-derived from buildYouGroups, which would be tautological):
    // changing the rendered rows must be a deliberate edit here too.
    const rendered = buildYouGroups().flatMap((g) => g.rows.map((r) => r.id));
    expect(rendered).toEqual([
      "dashboard", "your_data", "nila_memory", "settings",
      "thought_record", "self_compassion", "values_to_action", "skills", "understand", "why",
    ]);
    expect(YOU_ROW_IDS).toEqual(rendered); // YOU_ROW_IDS stays the flattened id list
  });
  it("buildYouGroups exposes the Manage and Resources groups in order", () => {
    expect(buildYouGroups().map((g) => g.title)).toEqual(["Manage", "Resources"]);
  });
});
