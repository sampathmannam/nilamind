// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TOOL_META } from "./toolMeta";

const recordToolUse = vi.fn();
vi.mock("../services/recentTools", () => ({
  recordToolUse: (id: string) => recordToolUse(id),
}));

import SkillsHubScreen from "./SkillsHubScreen";

const EXPECTED = [
  "problem_solving", "values_to_action", "social_rhythm", "exposure",
  "relapse_plan", "chain_analysis", "guided_programs",
];

afterEach(() => { cleanup(); recordToolUse.mockClear(); });

describe("SkillsHubScreen — launcher", () => {
  it("lists all seven skill destinations (guided programs restored)", () => {
    render(<SkillsHubScreen go={() => {}} />);
    for (const id of EXPECTED) {
      expect(screen.getByText(TOOL_META[id].label()), `row missing: ${id}`).toBeTruthy();
    }
  });

  it("routes and records on tap", () => {
    const go = vi.fn();
    render(<SkillsHubScreen go={go} />);
    fireEvent.click(screen.getByText(TOOL_META.guided_programs.label()));
    expect(recordToolUse).toHaveBeenCalledWith("guided_programs");
    expect(go).toHaveBeenCalledWith("guided_programs");
  });
});
