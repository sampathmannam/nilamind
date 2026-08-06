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

// Redesign 2026-08-06 (§5.4, deliberate golden update): You is 6 curated rows in ONE group.
// Removed: progress (duplicated the streak card), insights (duplicated the dashboard — merged into
// "Patterns"), about_nila (now a Settings row), thought_record (lives in the Journal hub),
// episode_marker (orphaned screen). No 'more' collapsing — everything visible.
describe("You hub rows (redesign §5.4)", () => {
  beforeEach(() => { store.clear(); setLanguage("en"); });

  it("renders exactly the 6 curated rows in order", () => {
    const rendered = buildYouGroups().flatMap((g) => g.rows.map((r) => r.id));
    expect(rendered).toEqual([
      "dashboard", "your_data", "nila_memory", "learn", "caregiver_settings", "settings",
    ]);
    expect(YOU_ROW_IDS).toEqual(rendered);
  });

  it("is a single group (no 'External resources' remainder)", () => {
    const groups = buildYouGroups();
    expect(groups.length).toBe(1);
    expect(groups[0].title).toBe(DICT.en.you_group_manage);
  });

  it("keeps the merged/moved destinations out", () => {
    for (const gone of [
      "progress", "insights", "about_nila", "thought_record", "episode_marker",
      "values_to_action", "behavioural_activation", "values_compass", "caregiver",
    ]) {
      expect(YOU_ROW_IDS, `retired row leaked back: ${gone}`).not.toContain(gone);
    }
  });

  it("dashboard row is relabeled Patterns (absorbs Insights)", () => {
    const row = buildYouGroups()[0].rows.find((r) => r.id === "dashboard")!;
    expect(row.label).toBe(DICT.en.you_dashboard_label);
    expect(DICT.en.you_dashboard_label).toBe("Patterns");
  });

  it("no row hides behind a 'more' toggle", () => {
    for (const r of buildYouGroups().flatMap((g) => g.rows)) {
      expect(r.more, `row "${r.id}" should not be collapsed`).toBeUndefined();
    }
  });
});

describe("You hub localization", () => {
  beforeEach(() => { store.clear(); setLanguage("en"); });

  it("localizes group title and row labels when language is set", () => {
    setLanguage("ta");
    const groups = buildYouGroups();
    expect(groups[0].title).toBe(DICT.ta.you_group_manage);
    const memory = groups[0].rows.find((r) => r.id === "nila_memory")!;
    expect(memory.label).toBe(DICT.ta.you_nila_memory_label);
    expect(memory.sub).toBe(DICT.ta.you_nila_memory_sub);
  });
});
