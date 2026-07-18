import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { parseValueDomains, draftValueDomains, safeDraftValueDomains } from "./valuesDraft";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";

let scriptedReply = JSON.stringify({ domains: ["family", "work"] });

beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

beforeEach(() => {
  scriptedReply = JSON.stringify({ domains: ["family", "work"] });
  const backend: LocalLlmBackend = {
    id: "fake",
    isReady: () => true,
    generate: async ({ onToken }) => { for (const t of scriptedReply.split("")) onToken(t); return scriptedReply; },
  };
  registerLocalLlmBackend(backend);
});

describe("parseValueDomains (presence-only, constrained to known domains)", () => {
  it("keeps known ids, drops unknown ones, dedupes, and caps at 4", () => {
    const out = parseValueDomains({ domains: ["family", "work", "not_a_domain", "family", "health", "play", "growth"] });
    expect(out).toEqual(["family", "work", "health", "play"]); // unknown dropped, dup dropped, capped at 4
  });
  it("returns [] for malformed input", () => {
    expect(parseValueDomains(null)).toEqual([]);
    expect(parseValueDomains({ domains: "family" })).toEqual([]);
  });
});

describe("draftValueDomains", () => {
  it("extracts the domains present in a story", async () => {
    const d = await draftValueDomains("i've been trying to be there for my kids while work is nuts");
    expect(d).toEqual(["family", "work"]);
  });
  it("returns [] on non-JSON output", async () => {
    scriptedReply = "family and work";
    expect(await draftValueDomains("whatever")).toEqual([]);
  });
});

describe("safeDraftValueDomains (§9-gated, never infers importance)", () => {
  it("returns the present domains for an ordinary story", async () => {
    const r = await safeDraftValueDomains("my family means everything and i want to grow at work");
    expect(r).toEqual({ ok: true, domains: ["family", "work"] });
  });

  it("never reaches the model for a crisis disclosure", async () => {
    const spy = { called: false };
    registerLocalLlmBackend({ id: "spy", isReady: () => true, generate: async ({ onToken }) => { spy.called = true; onToken("x"); return "x"; } });
    const r = await safeDraftValueDomains("i want to kill myself");
    expect(r).toEqual({ ok: false, reason: "crisis" });
    expect(spy.called).toBe(false);
  });

  it("returns empty when no life area clearly came up", async () => {
    scriptedReply = JSON.stringify({ domains: [] });
    expect(await safeDraftValueDomains("what time is it")).toEqual({ ok: false, reason: "empty" });
  });

  it("returns empty for a blank story", async () => {
    expect(await safeDraftValueDomains("   ")).toEqual({ ok: false, reason: "empty" });
  });
});
