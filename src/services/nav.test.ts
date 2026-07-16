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
    expect(resolveNavTarget("today")).toEqual({ kind: "tab", tab: "today" });
    expect(resolveNavTarget("you")).toEqual({ kind: "tab", tab: "you" });
    expect(resolveNavTarget("diary")).toEqual({ kind: "tab", tab: "diary" });
    expect(resolveNavTarget("plan")).toEqual({ kind: "tab", tab: "plan" });
  });
  it("treats removed product views as unknown", () => {
    // checkin screen is orphaned (replaced by in-chat NilaCheckIn); console is dev-facing only.
    expect(resolveNavTarget("checkin")).toEqual({ kind: "unknown", target: "checkin" });
    expect(resolveNavTarget("console")).toEqual({ kind: "unknown", target: "console" });
  });
  it("treats unknown targets as unknown", () => {
    expect(resolveNavTarget("oldtab")).toEqual({ kind: "unknown", target: "oldtab" });
  });
  it("maps known aux views including insights (values_to_action is a live Tools-hub route, not retired)", () => {
    expect(resolveNavTarget("dashboard")).toEqual({ kind: "aux", view: "dashboard" });
    expect(resolveNavTarget("values_to_action")).toEqual({ kind: "aux", view: "values_to_action" });
    expect(resolveNavTarget("skills")).toEqual({ kind: "unknown", target: "skills" });
    expect(resolveNavTarget("assessment")).toEqual({ kind: "aux", view: "assessment" });
    expect(resolveNavTarget("insights")).toEqual({ kind: "aux", view: "insights" });
  });
  it("resolves dbt_diary_card as a known aux view (the relocated DBT diary card)", () => {
    expect(resolveNavTarget("dbt_diary_card")).toEqual({ kind: "aux", view: "dbt_diary_card" });
  });
  it("returns unknown (no-op) for removed/typo'd targets", () => {
    expect(resolveNavTarget("behavioural_activation")).toEqual({ kind: "unknown", target: "behavioural_activation" });
    expect(resolveNavTarget("values_compass")).toEqual({ kind: "unknown", target: "values_compass" });
    expect(resolveNavTarget("episode_agent")).toEqual({ kind: "unknown", target: "episode_agent" });
    expect(resolveNavTarget("nila_voice")).toEqual({ kind: "unknown", target: "nila_voice" });
    expect(resolveNavTarget("totally_made_up")).toEqual({ kind: "unknown", target: "totally_made_up" });
    expect(resolveNavTarget("pact")).toEqual({ kind: "unknown", target: "pact" });
    expect(resolveNavTarget("armed_checkin")).toEqual({ kind: "unknown", target: "armed_checkin" });
    expect(resolveNavTarget("crisis_rehearsal")).toEqual({ kind: "unknown", target: "crisis_rehearsal" });
    expect(resolveNavTarget("peer_support")).toEqual({ kind: "aux", view: "peer_support" });
    expect(resolveNavTarget("why")).toEqual({ kind: "unknown", target: "why" });
  });
  it("exposes stable allowlists", () => {
    expect(KNOWN_AUX_VIEWS).toContain("values_to_action");
    expect(KNOWN_AUX_VIEWS).not.toContain("skills");
    expect(KNOWN_AUX_VIEWS).toContain("insights");
    expect(KNOWN_AUX_VIEWS).not.toContain("nila_voice");
    expect(KNOWN_AUX_VIEWS).not.toContain("pact");
    expect(KNOWN_AUX_VIEWS).not.toContain("armed_checkin");
    expect(KNOWN_AUX_VIEWS).not.toContain("crisis_rehearsal");
    expect(KNOWN_AUX_VIEWS).toContain("peer_support");
    expect(KNOWN_AUX_VIEWS).not.toContain("why");
    expect(TAB_TARGETS).toContain("today");
    expect(TAB_TARGETS).toContain("nila");
    expect(TAB_TARGETS).not.toContain("tools");
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

describe("nav — learn aux view", () => {
  it("resolves learn to an aux view", () => {
    expect(resolveNavTarget("learn")).toEqual({ kind: "aux", view: "learn" });
  });
  it("lists learn in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("learn");
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

describe("nav — insights aux view", () => {
  it("resolves insights to an aux view", () => {
    expect(resolveNavTarget("insights")).toEqual({ kind: "aux", view: "insights" });
  });
  it("lists insights in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("insights");
  });
});

describe("nav — safety_plan aux view", () => {
  it("resolves safety_plan to an aux view", () => {
    expect(resolveNavTarget("safety_plan")).toEqual({ kind: "aux", view: "safety_plan" });
  });
  it("lists safety_plan in the allowlist", () => {
    expect(KNOWN_AUX_VIEWS).toContain("safety_plan");
  });
});
