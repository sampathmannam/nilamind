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

import { armCheckin, getArmedCheckin, armedCheckinBody, armedCheckinPrompt, markCheckinFired } from "./armedCheckin";

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
