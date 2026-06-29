import { describe, it, expect } from "vitest";
import { resolveNavTarget, KNOWN_AUX_VIEWS, TAB_TARGETS } from "./nav";

describe("resolveNavTarget", () => {
  it("maps crisis to the crisis overlay", () => {
    expect(resolveNavTarget("crisis")).toEqual({ kind: "crisis" });
  });
  it("maps grounding and breathing to the plan tab (crisis overlay depends on this)", () => {
    expect(resolveNavTarget("grounding")).toEqual({ kind: "plan" });
    expect(resolveNavTarget("breathing")).toEqual({ kind: "plan" });
  });
  it("maps each footer/sub tab to a tab resolution", () => {
    expect(resolveNavTarget("nila")).toEqual({ kind: "tab", tab: "nila" });
    expect(resolveNavTarget("tools")).toEqual({ kind: "tab", tab: "tools" });
    expect(resolveNavTarget("you")).toEqual({ kind: "tab", tab: "you" });
    expect(resolveNavTarget("checkin")).toEqual({ kind: "tab", tab: "checkin" });
    expect(resolveNavTarget("diary")).toEqual({ kind: "tab", tab: "diary" });
    expect(resolveNavTarget("plan")).toEqual({ kind: "tab", tab: "plan" });
  });
  it("does NOT treat removed 'today' as a tab", () => {
    expect(resolveNavTarget("today")).toEqual({ kind: "unknown", target: "today" });
  });
  it("maps known aux views including the new values_to_action", () => {
    expect(resolveNavTarget("dashboard")).toEqual({ kind: "aux", view: "dashboard" });
    expect(resolveNavTarget("values_to_action")).toEqual({ kind: "aux", view: "values_to_action" });
    expect(resolveNavTarget("skills")).toEqual({ kind: "aux", view: "skills" });
    expect(resolveNavTarget("assessment")).toEqual({ kind: "aux", view: "assessment" });
  });
  it("returns unknown (no-op) for removed/typo'd targets", () => {
    expect(resolveNavTarget("insights")).toEqual({ kind: "unknown", target: "insights" });
    expect(resolveNavTarget("behavioural_activation")).toEqual({ kind: "unknown", target: "behavioural_activation" });
    expect(resolveNavTarget("values_compass")).toEqual({ kind: "unknown", target: "values_compass" });
    expect(resolveNavTarget("episode_agent")).toEqual({ kind: "unknown", target: "episode_agent" });
    expect(resolveNavTarget("nila_voice")).toEqual({ kind: "unknown", target: "nila_voice" });
    expect(resolveNavTarget("totally_made_up")).toEqual({ kind: "unknown", target: "totally_made_up" });
  });
  it("exposes stable allowlists", () => {
    expect(KNOWN_AUX_VIEWS).toContain("values_to_action");
    expect(KNOWN_AUX_VIEWS).not.toContain("insights");
    expect(KNOWN_AUX_VIEWS).not.toContain("nila_voice");
    expect(TAB_TARGETS).not.toContain("today");
    expect(TAB_TARGETS).toContain("nila");
  });
});

describe("nav — nila_memory aux view", () => {
  it("resolves nila_memory to an aux view", () => {
    expect(resolveNavTarget("nila_memory")).toEqual({ kind: "aux", view: "nila_memory" });
  });
  it("lists nila_memory in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("nila_memory");
  });
});

describe("nav — winddown aux view", () => {
  it("resolves winddown to an aux view", () => {
    expect(resolveNavTarget("winddown")).toEqual({ kind: "aux", view: "winddown" });
  });
  it("lists winddown in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("winddown");
  });
});

describe("nav — understand aux view", () => {
  it("resolves understand to an aux view", () => {
    expect(resolveNavTarget("understand")).toEqual({ kind: "aux", view: "understand" });
  });
  it("lists understand in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("understand");
  });
});

describe("nav — reach_out aux view", () => {
  it("resolves reach_out to an aux view", () => {
    expect(resolveNavTarget("reach_out")).toEqual({ kind: "aux", view: "reach_out" });
  });
  it("lists reach_out in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("reach_out");
  });
});
