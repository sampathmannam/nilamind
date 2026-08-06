import { describe, it, expect } from "vitest";
import { TOOL_META } from "./toolMeta";
import { t } from "../services/i18n";

// Every target that can appear in Recently/Pinned/hubs must resolve here — a missing id silently
// drops the row (the surfaces skip unknown ids), so this list is the registry's contract.
const REQUIRED_IDS = [
  "episode", "safety_plan",
  "calm_hub", "plan", "winddown", "sounds", "reach_out",
  "ema_checkin", "diary", "medication",
  "skills_hub", "assessment", "problem_solving", "values_to_action", "social_rhythm",
  "exposure", "relapse_plan", "chain_analysis", "guided_programs",
  "dashboard",
];

describe("TOOL_META registry", () => {
  it("covers every recordable target id", () => {
    for (const id of REQUIRED_IDS) {
      expect(TOOL_META[id], `missing TOOL_META entry: ${id}`).toBeTruthy();
    }
  });

  it("every entry has an icon and non-empty label/sub", () => {
    for (const id of REQUIRED_IDS) {
      const m = TOOL_META[id];
      expect(m.Icon, `${id}: Icon`).toBeTruthy();
      expect(m.iconClass.length > 0, `${id}: iconClass`).toBeTruthy();
      expect(m.label().length > 0, `${id}: label`).toBeTruthy();
      expect(m.sub().length > 0, `${id}: sub`).toBeTruthy();
    }
  });

  it("defers to the catalog's i18n keys where they exist (no label drift)", () => {
    expect(TOOL_META.winddown.label()).toBe(t("tool_winddown_label"));
    expect(TOOL_META.diary.label()).toBe(t("tool_diary_label"));
    expect(TOOL_META.ema_checkin.label()).toBe(t("tool_ema_label"));
  });

  it("uses only semantic color tokens (no raw Tailwind ramps)", () => {
    for (const id of REQUIRED_IDS) {
      expect(/text-(rose|orange|cyan|green|fuchsia|amber|sky|violet|indigo|blue|purple|teal)-\d/.test(TOOL_META[id].iconClass), `${id}: raw ramp in iconClass`).toBe(false);
    }
  });
});
