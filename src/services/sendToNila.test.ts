import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// NilaMind is fully on-device. We register a fake LocalLlmBackend (the real seam) so both modes route
// through the genuine §9 gates and the genuine on-device call — there is no cloud transport to mock.
vi.mock("./secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

import { sendToNila } from "./sendToNila";
import { NilaUiMessage } from "./nilaSend";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";
import { getCrisisReply } from "../safety";

// Suppress the node ExperimentalWarning for localStorage; crisisResources may touch it at import time.
beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

const noopDelta = { onDelta: () => {} };

// A backend that records every generate() call so we can assert WHAT reached the on-device model
// (system instruction + the exact outgoing messages) — the on-device equivalent of inspecting a wire body.
function recordingBackend(reply: string, ready = true) {
  const calls: { system: string; messages: { role: string; content: string }[] }[] = [];
  const backend: LocalLlmBackend = {
    id: "fake-gemma4",
    isReady: () => ready,
    generate: async ({ system, messages, onToken }) => {
      calls.push({ system, messages });
      onToken(reply);
      return reply;
    },
  };
  return { backend, calls };
}

describe("sendToNila — invariant #1 (crisis blocks send, both modes, zero model call)", () => {
  let calls: ReturnType<typeof recordingBackend>["calls"];
  beforeEach(() => {
    const rec = recordingBackend("should not be generated");
    calls = rec.calls;
    registerLocalLlmBackend(rec.backend);
  });

  it("companion: a crisis phrase short-circuits before the on-device model runs", async () => {
    const history: NilaUiMessage[] = [{ role: "user", content: "I want to die" }];
    const res = await sendToNila(history, "companion", noopDelta);
    expect(res.blocked).toBe(true);
    expect(res.reply).toBe(getCrisisReply());
    expect(res.reachedAI).toBe(false);
    expect(calls).toHaveLength(0); // model never called
  });

  it("episode: a crisis phrase at the opening short-circuits before the on-device model runs", async () => {
    const history: NilaUiMessage[] = [{ role: "user", content: "I can't go on" }];
    const res = await sendToNila(history, "episode", noopDelta);
    expect(res.blocked).toBe(true);
    expect(res.reply).toBe(getCrisisReply());
    expect(calls).toHaveLength(0);
  });
});

describe("sendToNila — companion path (on-device)", () => {
  it("routes companion to the local model with synthetic turns stripped", async () => {
    const rec = recordingBackend("I'm here with you.");
    registerLocalLlmBackend(rec.backend);
    const history: NilaUiMessage[] = [
      { role: "user", content: "I'm anxious" },
      { role: "assistant", content: "what is your intensity?", synthetic: true },
    ];
    const res = await sendToNila(history, "companion", noopDelta);
    expect(rec.calls).toHaveLength(1);
    expect(rec.calls[0].messages).toEqual([{ role: "user", content: "I'm anxious" }]);
    expect(res.reachedAI).toBe(true);
    expect(res.reply).toBe("I'm here with you.");
    // local mode has no tools — navigate/openSkillId are always absent (shape-compat with the old cloud result)
    expect(res.navigate).toBeUndefined();
    expect(res.openSkillId).toBeUndefined();
  });

  it("no model loaded → offline (reachedAI false), never a network", async () => {
    registerLocalLlmBackend(null);
    const res = await sendToNila([{ role: "user", content: "hi" }], "companion", noopDelta);
    expect(res.reachedAI).toBe(false);
    expect(res.reply).toBe("");
  });
});

describe("sendToNila — episode path (invariants #2 + #5, on-device)", () => {
  it("episode uses the EPISODE prompt with the crisis-line placeholder substituted, no tools concept", async () => {
    const rec = recordingBackend("That pain is real.");
    registerLocalLlmBackend(rec.backend);
    const history: NilaUiMessage[] = [{ role: "user", content: "everything is racing" }];
    await sendToNila(history, "episode", noopDelta);
    expect(rec.calls).toHaveLength(1);
    // The episode system instruction is sent (invariant #5: the EPISODE prompt, never the companion one).
    expect(rec.calls[0].system).toContain("EPISODE SUPPORT");
    // Invariant #4: [REGION_CRISIS_LINES] is substituted before it reaches the model.
    expect(rec.calls[0].system).not.toContain("[REGION_CRISIS_LINES]");
    // On-device generation takes only (system, messages) — there is structurally no tools field to leak.
  });

  it("episode strips synthetic turns from the outgoing messages (invariant #2)", async () => {
    const rec = recordingBackend("ok");
    registerLocalLlmBackend(rec.backend);
    const history: NilaUiMessage[] = [
      { role: "user", content: "everything is racing" },
      { role: "assistant", content: "lock in your intensity 1-10", synthetic: true },
      { role: "assistant", content: "Logged current intensity: 8/10.", synthetic: true },
      { role: "user", content: "8" },
    ];
    await sendToNila(history, "episode", noopDelta);
    expect(rec.calls[0].messages).toEqual([
      { role: "user", content: "everything is racing" },
      { role: "user", content: "8" },
    ]);
    expect(JSON.stringify(rec.calls[0].messages)).not.toContain("Logged current intensity");
  });

  it("episode returns reachedAI=false when no model is loaded", async () => {
    registerLocalLlmBackend(null);
    const history: NilaUiMessage[] = [{ role: "user", content: "racing" }];
    const res = await sendToNila(history, "episode", noopDelta);
    expect(res.reachedAI).toBe(false);
    expect(res.reply).toBe("");
  });

  it("episode returns reachedAI=false when the device generation throws", async () => {
    const backend: LocalLlmBackend = {
      id: "fake-gemma4", isReady: () => true,
      generate: async () => { throw new Error("model oom"); },
    };
    registerLocalLlmBackend(backend);
    const res = await sendToNila([{ role: "user", content: "racing" }], "episode", noopDelta);
    expect(res.reachedAI).toBe(false);
    expect(res.reply).toBe("");
  });
});
