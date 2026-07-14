import { describe, it, expect, beforeEach, vi } from "vitest";
import { YOU_ROW_IDS, buildYouGroups } from "./youRows";

const store = new Map<string, string>();
vi.mock("../services/storageUtils", () => ({
  ls: () => ({
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  }),
  DAY_MS: 86_400_000,
}));

import { setLanguage, DICT } from "../services/i18n";

describe("You hub rows (redesign §2)", () => {
  it("includes the Resources group rows", () => {
    for (const id of ["thought_record", "learn", "insights"]) {
      expect(YOU_ROW_IDS).toContain(id);
    }
  });
  it("retired values_to_action from the You hub (BA now runs as an in-chat protocol, not a standalone screen — PLAN_OF_ACTION A6)", () => {
    expect(YOU_ROW_IDS).not.toContain("values_to_action");
    expect(YOU_ROW_IDS).not.toContain("behavioural_activation");
    expect(YOU_ROW_IDS).not.toContain("values_compass");
    expect(YOU_ROW_IDS).not.toContain("caregiver");
  });
  it("includes the What Nila remembers row", () => {
    expect(YOU_ROW_IDS).toContain("nila_memory");
  });
  it("renders exactly the expected hub rows in order (catches accidental add/remove/reorder)", () => {
    const rendered = buildYouGroups().flatMap((g) => g.rows.map((r) => r.id));
    expect(rendered).toEqual([
      "dashboard", "your_data", "settings", "caregiver_settings",
      "about_nila", "nila_memory", "thought_record", "learn", "insights", "wellbeing", "episode_marker",
    ]);
    expect(YOU_ROW_IDS).toEqual(rendered);
  });
  it("buildYouGroups exposes the Manage and Resources groups in order", () => {
    expect(buildYouGroups().map((g) => g.title)).toEqual(["Manage", "Resources"]);
  });
});

describe("You hub localization", () => {
  beforeEach(() => { store.clear(); setLanguage("en"); });

  it("localizes group titles and row labels when language is set", () => {
    setLanguage("ta");
    const groups = buildYouGroups();
    expect(groups.map((g) => g.title)).toEqual([DICT.ta.you_group_manage, DICT.ta.you_group_resources]);
    const about = groups[1].rows.find((r) => r.id === "about_nila")!;
    expect(about.label).toBe(DICT.ta.you_about_nila_label);
    expect(about.sub).toBe(DICT.ta.you_about_nila_sub);
  });
});
