import { describe, it, expect, beforeEach } from "vitest";
import { secureLocal } from "./secureLocal";
import { recordToolUse, getRecentTools, getAllRecentTools } from "./recentTools";

const KEY = "nilamind_recent_tools";

beforeEach(() => secureLocal.removeItem(KEY));

describe("recentTools", () => {
  it("getRecentTools/getAllRecentTools return [] when nothing recorded", () => {
    expect(getRecentTools()).toEqual([]);
    expect(getAllRecentTools()).toEqual([]);
  });

  it("recordToolUse adds an entry readable by getRecentTools", () => {
    recordToolUse("breathing");
    const recent = getRecentTools();
    expect(recent).toHaveLength(1);
    expect(recent[0].target).toBe("breathing");
    expect(typeof recent[0].timestamp).toBe("number");
  });

  it("most recently used tool is first", () => {
    recordToolUse("breathing");
    recordToolUse("diary");
    expect(getRecentTools()[0].target).toBe("diary");
    expect(getRecentTools()[1].target).toBe("breathing");
  });

  it("re-using a tool moves it to the front instead of duplicating it", () => {
    recordToolUse("breathing");
    recordToolUse("diary");
    recordToolUse("breathing");
    const all = getAllRecentTools();
    expect(all.filter((e) => e.target === "breathing")).toHaveLength(1);
    expect(all[0].target).toBe("breathing");
  });

  it("getRecentTools caps at 3 even when more are stored", () => {
    recordToolUse("a");
    recordToolUse("b");
    recordToolUse("c");
    recordToolUse("d");
    expect(getRecentTools()).toHaveLength(3);
    expect(getRecentTools().map((e) => e.target)).toEqual(["d", "c", "b"]);
  });

  it("getAllRecentTools caps at 5 stored entries (ToolsScreen pinning needs more than 3 for frequency ranking)", () => {
    for (const t of ["a", "b", "c", "d", "e", "f"]) recordToolUse(t);
    expect(getAllRecentTools().length).toBeLessThanOrEqual(5);
  });

  it("survives a corrupt stored value rather than throwing", () => {
    secureLocal.setItem(KEY, "not valid json");
    expect(() => getRecentTools()).not.toThrow();
    expect(getRecentTools()).toEqual([]);
  });

  it("is persisted via secureLocal, not raw localStorage (2026-08-06: this data reveals which coping tools a user opens — health-adjacent, must be encrypted like every other persisted key)", () => {
    recordToolUse("safety-plan");
    expect(secureLocal.getItem(KEY)).toBeTruthy();
  });
});

// 15-day longitudinal run (2026-08-24): opening a child through the Calm hub recorded BOTH the hub
// and the child, so Home's "Recently" listed "Calm space" and "Breathing & Grounding" as sibling
// rows with the same wind icon and the same "2d ago" — a doorway masquerading as a destination.
describe("recentTools — hubs are not destinations", () => {
  it("ignores hub ids so a hub never appears beside the child opened through it", () => {
    recordToolUse("calm_hub");
    recordToolUse("skills_hub");
    expect(getRecentTools()).toHaveLength(0);
    recordToolUse("winddown");
    expect(getRecentTools().map((e) => e.target)).toEqual(["winddown"]);
  });
});
