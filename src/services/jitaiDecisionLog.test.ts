// jitaiDecisionLog.test.ts — capped, privacy-safe JITAI decision log (2026-07-12 Wave 3 §6).
import { describe, it, expect, beforeEach, vi } from "vitest";

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
  // Mirrors the real appendToSecureArray's atomic read-modify-write + cap behaviour
  // (secureLocal.ts:255) against the same in-memory store used above.
  appendToSecureArray: (key: string, item: unknown, cap?: number) => {
    const raw = store.get(key);
    let arr: unknown[] = raw ? JSON.parse(raw) : [];
    arr.push(item);
    if (cap && arr.length > cap) arr = arr.slice(arr.length - cap);
    store.set(key, JSON.stringify(arr));
    return arr;
  },
}));

import { logJitaiDecision, getJitaiDecisionLog, logAndGateJitaiDecision } from "./jitaiDecisionLog";
import type { JitaiDecision } from "./jitaiEngine";

const moodDecision: JitaiDecision = {
  shouldNudge: true,
  triggers: ["mood_deterioration"],
  severity: "noticeable",
  nudgeText: "things might be feeling heavier than usual",
  suggestedTool: "grounding",
  protocolRecommendation: null,
};

const noDecision: JitaiDecision = {
  shouldNudge: false,
  triggers: [],
  severity: "gentle",
  nudgeText: "",
  suggestedTool: null,
  protocolRecommendation: null,
};

describe("jitaiDecisionLog — entry shape + cap (2026-07-12 Wave 3 §6)", () => {
  beforeEach(() => store.clear());

  it("logs the exact entry shape and excludes nudgeText/lastUserText (privacy discipline)", () => {
    logJitaiDecision(moodDecision, "in_app_card");
    const log = getJitaiDecisionLog();
    expect(log.length).toBe(1);
    const entry = log[0];
    expect(typeof entry.timestamp).toBe("number");
    expect(entry.triggers).toEqual(["mood_deterioration"]);
    expect(entry.severity).toBe("noticeable");
    expect(entry.suggestedTool).toBe("grounding");
    expect(entry.surface).toBe("in_app_card");
    expect(entry.fired).toBe(true);
    expect(entry.engaged).toBeNull();
    expect(entry).not.toHaveProperty("nudgeText");
    expect(entry).not.toHaveProperty("lastUserText");
  });

  it("records suppressedBy when the caller marks the decision suppressed", () => {
    logJitaiDecision(moodDecision, "chat_context", { fired: false, suppressedBy: "trigger_cooldown" });
    const entry = getJitaiDecisionLog()[0];
    expect(entry.fired).toBe(false);
    expect(entry.suppressedBy).toBe("trigger_cooldown");
  });

  it("caps at 100 entries, keeping the newest (matches exportAudit.ts precedent)", () => {
    for (let i = 0; i < 130; i++) logJitaiDecision(moodDecision, "in_app_card");
    expect(getJitaiDecisionLog().length).toBe(100);
  });
});

describe("logAndGateJitaiDecision — combined receptivity-gate + log wrapper", () => {
  beforeEach(() => store.clear());

  it("fires and logs on the first occurrence of a trigger", () => {
    const r = logAndGateJitaiDecision(moodDecision, "in_app_card");
    expect(r.fired).toBe(true);
    expect(r.suppressedBy).toBeUndefined();
    expect(getJitaiDecisionLog().length).toBe(1);
    expect(getJitaiDecisionLog()[0].fired).toBe(true);
  });

  it("suppresses a repeated identical trigger within its cooldown window (fired:false, suppressedBy:'trigger_cooldown')", () => {
    logAndGateJitaiDecision(moodDecision, "in_app_card");
    const r2 = logAndGateJitaiDecision(moodDecision, "in_app_card");
    expect(r2.fired).toBe(false);
    expect(r2.suppressedBy).toBe("trigger_cooldown");
    expect(getJitaiDecisionLog().length).toBe(2);
    expect(getJitaiDecisionLog()[1].fired).toBe(false);
    expect(getJitaiDecisionLog()[1].suppressedBy).toBe("trigger_cooldown");
  });

  it("elevation_risk is never gated, regardless of repetition (safety-adjacent, override-only-forward)", () => {
    const elevation: JitaiDecision = { ...moodDecision, triggers: ["elevation_risk"], severity: "urgent" };
    logAndGateJitaiDecision(elevation, "in_app_card");
    const r2 = logAndGateJitaiDecision(elevation, "in_app_card");
    expect(r2.fired).toBe(true);
    expect(r2.suppressedBy).toBeUndefined();
  });

  it("different trigger types have independent cooldowns", () => {
    logAndGateJitaiDecision(moodDecision, "in_app_card"); // mood_deterioration fires + marks shown
    const sleep: JitaiDecision = { ...moodDecision, triggers: ["sleep_prodrome"] };
    const r = logAndGateJitaiDecision(sleep, "in_app_card");
    expect(r.fired).toBe(true);
  });

  it("does not write a log entry when there is nothing to decide (shouldNudge:false)", () => {
    const r = logAndGateJitaiDecision(noDecision, "in_app_card");
    expect(r.fired).toBe(false);
    expect(getJitaiDecisionLog().length).toBe(0);
  });
});
