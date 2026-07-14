import { describe, it, expect } from "vitest";
import { ACTIONS } from "./QuickActions";

describe("QuickActions action list", () => {
  it("has unique ids", () => {
    const ids = ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps essential quick-access tools", () => {
    const ids = ACTIONS.map((a) => a.id);
    // Core tools that must be quickly accessible from the chat tab
    expect(ids).toContain("grounding");
    expect(ids).toContain("breathing");
    expect(ids).toContain("diary");
    expect(ids).toContain("medication");
    expect(ids).toContain("crisis");
  });

  it("excludes tools that have prominent Today tab entry points", () => {
    const ids = ACTIONS.map((a) => a.id);
    // These tools already have prominent Today tab entry points (hero action, mood card)
    // and don't need to be duplicated in QuickActions
    expect(ids).not.toContain("dashboard");
    expect(ids).not.toContain("learn");
  });

  it("shows calming tools when elevated", () => {
    const ids = ACTIONS.filter((a) => a.modes.includes("day")).map((a) => a.id);
    expect(ids).toContain("grounding");
    expect(ids).toContain("breathing");
  });
});
