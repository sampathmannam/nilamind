import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));
vi.mock("./sessionChat", () => ({
  getSessionChat: vi.fn(() => [
    { role: "user", content: "I'm nervous about tomorrow" },
    { role: "assistant", content: "I'm here" },
  ]),
}));

import { armCheckin, getArmedCheckin, armedCheckinBody, armedCheckinPrompt, markCheckinFired, requestArmedCheckin, looksLikeArmRequest } from "./armedCheckin";

describe("armedCheckin", () => {
  beforeEach(() => { store.clear(); });

  it("armCheckin sets trigger to 8pm for 'tonight'", () => {
    const entry = armCheckin("check on me tonight");
    const trigger = new Date(entry.triggerAt);
    expect(trigger.getHours()).toBe(20);
  });

  it("armCheckin sets trigger to 8am for 'morning'", () => {
    const entry = armCheckin("check on me in the morning");
    const trigger = new Date(entry.triggerAt);
    expect(trigger.getHours()).toBe(8);
  });

  it("captures last user message as context", () => {
    const entry = armCheckin("check on me tonight");
    expect(entry.context).toContain("nervous");
  });

  it("getArmedCheckin returns null when nothing armed", () => {
    expect(getArmedCheckin()).toBeNull();
  });

  it("getArmedCheckin returns entry when armed and not fired", () => {
    armCheckin("check on me tonight");
    const entry = getArmedCheckin();
    expect(entry).not.toBeNull();
    expect(entry!.fired).toBe(false);
  });

  it("getArmedCheckin returns null after fires", () => {
    armCheckin("check on me tonight");
    markCheckinFired();
    expect(getArmedCheckin()).toBeNull();
  });

  it("armedCheckinBody is dataless — never includes user content", () => {
    armCheckin("check on me, I feel terrible");
    const body = armedCheckinBody();
    expect(body).not.toContain("terrible");
    expect(body).toContain("check in");
  });

  it("armedCheckinPrompt includes context when available", () => {
    const entry = armCheckin("check on me tonight");
    const prompt = armedCheckinPrompt(entry);
    expect(prompt).toContain("nervous");
  });
});

describe("requestArmedCheckin — safety-gated opt-in", () => {
  beforeEach(() => { store.clear(); });

  it("arms on an explicit request", () => {
    const r = requestArmedCheckin("Can you check on me later?");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.triggerLabel).toContain("8:00pm");
  });

  it("does not arm when the user did not ask", () => {
    const r = requestArmedCheckin("I'm going to bed now");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("not-requested");
  });

  it("blocks arming on crisis text", () => {
    const r = requestArmedCheckin("Check on me, I want to die");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("crisis");
  });

  it("blocks arming on elevation markers", () => {
    const r = requestArmedCheckin("Check on me, I don't need sleep and I can change the world tonight");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("elevation");
  });

  it("blocks arming when the user asked for quiet", () => {
    const r = requestArmedCheckin("Check on me later but keep it quiet and do not disturb");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("quiet");
  });

  it("frequency-caps to one armed check-in per 24h", () => {
    expect(requestArmedCheckin("Check on me tonight").ok).toBe(true);
    const second = requestArmedCheckin("Check on me in the morning too");
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("frequency");
  });

  it("looksLikeArmRequest detects phrasing variants", () => {
    expect(looksLikeArmRequest("check on me later")).toBe(true);
    expect(looksLikeArmRequest("nudge me this evening")).toBe(true);
    expect(looksLikeArmRequest("remind me later")).toBe(true);
    expect(looksLikeArmRequest("I'm fine")).toBe(false);
  });
});

// audit #19: a "tonight" (or default) request made after 8pm must not arm a trigger in the past.
describe("armCheckin — past-time guard", () => {
  beforeEach(() => { store.clear(); vi.useRealTimers(); });

  it("'tonight' requested after 8pm arms for the future (tomorrow 8pm), not the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 9, 21, 30, 0)); // 9:30pm local
    const e = armCheckin("check in on me tonight");
    expect(e.triggerAt).toBeGreaterThan(Date.now());
    expect(new Date(e.triggerAt).getHours()).toBe(20);
    vi.useRealTimers();
  });

  it("default (no keyword) requested after 8pm also rolls to the future", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 9, 23, 0, 0)); // 11pm local
    const e = armCheckin("please look after me");
    expect(e.triggerAt).toBeGreaterThan(Date.now());
    vi.useRealTimers();
  });

  it("'tonight' requested before 8pm arms for tonight 8pm", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 9, 15, 0, 0)); // 3pm local
    const e = armCheckin("check in on me tonight");
    expect(e.triggerAt).toBeGreaterThan(Date.now());
    const d = new Date(e.triggerAt);
    expect(d.getHours()).toBe(20);
    expect(d.getDate()).toBe(9);
    vi.useRealTimers();
  });
});
