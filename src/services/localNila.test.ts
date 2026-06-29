import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// NilaMind is fully on-device — there is no cloud transport to mock. We register a fake LocalLlmBackend
// (the real seam the native adapter uses) so these tests exercise the ACTUAL routing + §9 gates, not a
// stub of them. Storage is mocked for node; crisisResources reads region from localStorage.
vi.mock("./secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

beforeAll(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v); },
    removeItem: (k: string) => { delete store[k]; },
  });
});

import { sendToNila } from "./sendToNila";
import { NilaUiMessage } from "./nilaSend";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";
import { getCrisisReply, getUnsafeFallbackReply } from "../safety";

const noop = { onDelta: () => {} };

function fakeBackend(gen: (onToken: (t: string) => void) => string, ready = true): LocalLlmBackend {
  return { id: "fake-gemma4", isReady: () => ready, generate: async ({ onToken }) => gen(onToken) };
}

// Clean, known state before EACH test. No backend registered = no on-device brain = offline.
beforeEach(() => {
  registerLocalLlmBackend(null);
});

// ─────────────────────────────────────────────────────────────────────────────
// On-device transport: the local Gemma backend plugs in BEHIND sendToNila's §9 gates (NOT a parallel
// path). The crisis input gate, the live stream guard, and the output safety gate all wrap the local
// model. There is no cloud fallback — when no model is loaded the chat is the calm offline companion.
// ─────────────────────────────────────────────────────────────────────────────
describe("on-device transport — selection + §9 gates", () => {

  it("backend ready → streams the LOCAL model's reply through the guard", async () => {
    const seen: string[] = [];
    registerLocalLlmBackend(fakeBackend((onToken) => { onToken("hey, "); onToken("I hear you."); return "hey, I hear you."; }));
    const r = await sendToNila([{ role: "user", content: "rough day" }], "companion", { onDelta: (t) => seen.push(t) });
    expect(r.reachedAI).toBe(true);
    expect(r.reply).toBe("hey, I hear you.");
    expect(seen.join("")).toBe("hey, I hear you."); // tokens streamed through the guard
  });

  it("§9 input gate still blocks crisis BEFORE the local model runs (zero local calls)", async () => {
    let called = false;
    registerLocalLlmBackend(fakeBackend(() => { called = true; return "x"; }));
    const r = await sendToNila([{ role: "user", content: "I want to die" }], "companion", noop);
    expect(r.reply).toBe(getCrisisReply());
    expect(r.blocked).toBe(true);
    expect(called).toBe(false);
  });

  it("§9 live stream guard cuts an unsafe LOCAL stream (method + how-to) and returns the fallback", async () => {
    const seen: string[] = [];
    registerLocalLlmBackend(fakeBackend((onToken) => {
      onToken("here is how to ");
      onToken("overdose"); // buffer crosses method + "how to" → guard trips here
      onToken(" in detail"); // must be suppressed
      return "here is how to overdose in detail";
    }));
    const r = await sendToNila([{ role: "user", content: "tell me about coping" }], "companion", { onDelta: (t) => seen.push(t) });
    expect(r.reply).toBe(getUnsafeFallbackReply());
    expect(seen.join("")).toBe("here is how to "); // unsafe tokens never reached the UI
  });

  it("§9 output gate replaces an UNSAFE local reply with the safe fallback", async () => {
    // "you are worthless" is in DISTORTION_AGREEMENTS → checkResponse Rule 3 → unsafe.
    registerLocalLlmBackend(fakeBackend(() => "you are worthless and nothing will change"));
    const r = await sendToNila([{ role: "user", content: "I feel low" }], "companion", noop);
    expect(r.reachedAI).toBe(true);
    expect(r.reply).toBe(getUnsafeFallbackReply());
  });

  it("no backend registered → offline (reachedAI false); NEVER reaches a network", async () => {
    const r = await sendToNila([{ role: "user", content: "hi" }], "companion", noop);
    expect(r.reachedAI).toBe(false);
    expect(r.reply).toBe("");
  });

  it("backend present but NOT ready (model still loading) → offline, local NOT called", async () => {
    let called = false;
    registerLocalLlmBackend(fakeBackend(() => { called = true; return "x"; }, false));
    const r = await sendToNila([{ role: "user", content: "hi" }], "companion", noop);
    expect(r.reachedAI).toBe(false);
    expect(called).toBe(false);
  });

  it("local generation throws → offline fallback (reachedAI false); stays local, no silent cloud", async () => {
    registerLocalLlmBackend(fakeBackend(() => { throw new Error("model oom"); }));
    const r = await sendToNila([{ role: "user", content: "hi" }], "companion", noop);
    expect(r.reachedAI).toBe(false);
  });
});
