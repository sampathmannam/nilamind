import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";

// NilaMind is fully on-device. These §9 invariant tests register a fake LocalLlmBackend (the real seam)
// so they route through the genuine gates and the genuine on-device call — the §9 rails wrap the local
// model exactly as they must, and there is no cloud transport to mock.
vi.mock("./secureLocal", () => ({
  secureLocal: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}));

import { sendToNila } from "./sendToNila";
import { NilaUiMessage } from "./nilaSend";
import { buildEpisodeSystem } from "./episodePrompt";
import { buildNilaSystem } from "./nila";
import { applyOutputSafety } from "./nilaSafetyGate";
import { registerLocalLlmBackend, type LocalLlmBackend } from "./localLlm";
import { getCrisisReply, getUnsafeFallbackReply } from "../safety";

// Stub localStorage globally so crisisResources.ts can run in node env without errors.
beforeAll(() => {
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});

const noop = { onDelta: () => {} };

// Records every generate() call (system + outgoing messages) so we can assert WHAT reached the model.
function recordingBackend(reply: string) {
  const calls: { system: string; messages: { role: string; content: string }[] }[] = [];
  const backend: LocalLlmBackend = {
    id: "fake", isReady: () => true,
    generate: async ({ system, messages, onToken }) => { calls.push({ system, messages }); onToken(reply); return reply; },
  };
  return { backend, calls };
}
// Emits scripted tokens via onToken, then resolves with the full string (for the live stream-guard tests).
function streamBackend(tokens: string[], full?: string): LocalLlmBackend {
  return { id: "fake", isReady: () => true, generate: async ({ onToken }) => { for (const t of tokens) onToken(t); return full ?? tokens.join(""); } };
}

beforeEach(() => registerLocalLlmBackend(null));

// ─────────────────────────────────────────────────────────────────────────────
// §9 INVARIANT 1 — Crisis scan fires BEFORE any send, BOTH modes.
// Input: real SUICIDAL_KEYWORDS that scanForCrisis matches. Expected: getCrisisReply()
// returned, the on-device model is NEVER called.
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 invariant 1 — crisis scan short-circuits before the model runs, BOTH modes", () => {
  it("companion blocks and never calls the local model", async () => {
    const rec = recordingBackend("x");
    registerLocalLlmBackend(rec.backend);
    const h: NilaUiMessage[] = [{ role: "user", content: "I want to die" }];
    const r = await sendToNila(h, "companion", noop);
    expect(r.reply).toBe(getCrisisReply());
    expect(rec.calls).toHaveLength(0);
  });
  it("episode blocks at the opening and never calls the local model", async () => {
    const rec = recordingBackend("x");
    registerLocalLlmBackend(rec.backend);
    const h: NilaUiMessage[] = [{ role: "user", content: "no reason to live" }];
    const r = await sendToNila(h, "episode", noop);
    expect(r.reply).toBe(getCrisisReply());
    expect(rec.calls).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 INVARIANT 2 — Synthetic turns NEVER reach the model.
// Input: history with synthetic:true turns mixed in. Expected: the messages handed to
// the on-device model contain ONLY the non-synthetic turns.
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 invariant 2 — synthetic turns never reach the model", () => {
  it("episode payload excludes synthetic intensity/lock turns", async () => {
    const rec = recordingBackend("That pain is real.");
    registerLocalLlmBackend(rec.backend);
    const h: NilaUiMessage[] = [
      { role: "user", content: "spiralling" },
      { role: "assistant", content: "lock in 1-10", synthetic: true },
      { role: "assistant", content: "Logged current intensity: 9/10.", synthetic: true },
      { role: "user", content: "9" },
    ];
    await sendToNila(h, "episode", noop);
    expect(JSON.stringify(rec.calls[0].messages)).not.toContain("Logged current intensity");
    expect(JSON.stringify(rec.calls[0].messages)).not.toContain("lock in 1-10");
    expect(rec.calls[0].messages).toEqual([
      { role: "user", content: "spiralling" },
      { role: "user", content: "9" },
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 INVARIANT 3 — applyOutputSafety runs once on every reachedAI reply; offline
// scripted reply is NOT re-scanned. The pure gate is the authority for both paths.
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 invariant 3 — checkResponse replaces unsafe replies in BOTH modes", () => {
  it("companion unsafe reply to crisis-adjacent input is replaced", () => {
    expect(applyOutputSafety("just relax", "I want to die", true)).toBe(getUnsafeFallbackReply());
  });
  it("episode unsafe reply is replaced too", () => {
    expect(applyOutputSafety("you'll be fine", "can't go on", true)).toBe(getUnsafeFallbackReply());
  });
  it("scripted offline fallback is never scanned/replaced", () => {
    const offline = "I can't reach Nila — grounding tools still work.";
    expect(applyOutputSafety(offline, "I want to die", false)).toBe(offline);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 INVARIANT 3 (e2e) — sendToNila ACTUALLY CALLS applyOutputSafety on BOTH modes.
// An UNSAFE on-device reply is replaced by getUnsafeFallbackReply(). Unsafe pair is a
// Rule-3 (cognitive-distortion agreement) so the INPUT does NOT trip the invariant-1
// crisis block (the message must reach the model for the output gate to be exercised).
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 invariant 3 (e2e) — sendToNila invokes applyOutputSafety on BOTH modes", () => {
  it("companion: unsafe AI reply (Rule-3 distortion agreement) is replaced by fallback", async () => {
    // "I feel worthless" is NOT in SUICIDAL_KEYWORDS → no crisis block.
    // "you are worthless" is in DISTORTION_AGREEMENTS → checkResponse Rule 3 → unsafe.
    registerLocalLlmBackend(streamBackend(["you are worthless and nothing will change"]));
    const h: NilaUiMessage[] = [{ role: "user", content: "I feel worthless" }];
    const r = await sendToNila(h, "companion", noop);
    expect(r.reply).toBe(getUnsafeFallbackReply());
    expect(r.reachedAI).toBe(true);
  });

  it("episode: unsafe AI reply (Rule-3 distortion agreement) is replaced by fallback", async () => {
    // "I feel like a failure" is NOT in SUICIDAL_KEYWORDS → no crisis block.
    // "you're a failure" is in DISTORTION_AGREEMENTS → checkResponse Rule 3 → unsafe.
    registerLocalLlmBackend(streamBackend(["you're a failure and that's just the truth"]));
    const h: NilaUiMessage[] = [{ role: "user", content: "I feel like a failure" }];
    const r = await sendToNila(h, "episode", noop);
    expect(r.reply).toBe(getUnsafeFallbackReply());
    expect(r.reachedAI).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 INVARIANT 4 — No [REGION_CRISIS_LINES] survives in ANY outgoing systemInstruction.
// Verified against the real builders.
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 invariant 4 — no [REGION_CRISIS_LINES] survives in any outgoing systemInstruction", () => {
  it("episode systemInstruction has the placeholder substituted", () => {
    expect(buildEpisodeSystem([])).not.toContain("[REGION_CRISIS_LINES]");
  });
  it("companion systemInstruction has the placeholder substituted", () => {
    expect(buildNilaSystem()).not.toContain("[REGION_CRISIS_LINES]");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 INVARIANT 5 — Episode uses the EPISODE prompt (not the companion one). On-device
// generation takes only (system, messages), so there is structurally no tools field.
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 invariant 5 — episode uses the EPISODE prompt", () => {
  it("episode hands the EPISODE system instruction to the model (not the companion prompt)", async () => {
    const rec = recordingBackend("ok");
    registerLocalLlmBackend(rec.backend);
    const h: NilaUiMessage[] = [{ role: "user", content: "everything hurts" }];
    await sendToNila(h, "episode", noop);
    expect(rec.calls[0].system).toContain("EPISODE SUPPORT");
    // "EPISODE SUPPORT" is episode-exclusive — the companion prompt never carries it, so this proves
    // the episode path used the EPISODE instruction, not the companion one.
    expect(buildNilaSystem()).not.toContain("EPISODE SUPPORT");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9 STREAMING GUARD (e2e) — the companion path wires createStreamGuard so an unsafe
// stream is cut LIVE: once the streamed buffer crosses into method+"how to" the later
// tokens are NEVER forwarded to the UI onDelta, and the returned reply is the safe
// fallback. `seen` is the distinguishing assertion — without the guard every delta
// (including the unsafe ones) would have been forwarded.
// ─────────────────────────────────────────────────────────────────────────────
describe("§9 streaming guard (e2e) — companion tripped stream suppresses unsafe tokens", () => {
  it("cuts the live stream at method+how-to and returns the fallback (local mode has no tool side effects)", async () => {
    const seen: string[] = [];
    registerLocalLlmBackend(streamBackend(
      ["here is how to ", "overdose", " in detail"], // buffer crosses method + "how to" at "overdose" → trips
      "here is how to overdose in detail",
    ));
    const h: NilaUiMessage[] = [{ role: "user", content: "tell me about coping" }];
    const r = await sendToNila(h, "companion", { onDelta: (t) => seen.push(t) });
    expect(r.reply).toBe(getUnsafeFallbackReply());
    expect(r.reachedAI).toBe(true);
    expect(seen.join("")).toBe("here is how to "); // unsafe tokens never forwarded to the UI
    expect(r.navigate).toBeUndefined(); // local mode never drives UI; doubly-guaranteed on an unsafe turn
    expect(r.openSkillId).toBeUndefined();
  });

  it("lets a benign CBT reframe stream through unchanged (no false trip) — positive control", async () => {
    const seen: string[] = [];
    const benign = "You're not worthless — that's the anxiety talking.";
    registerLocalLlmBackend(streamBackend(
      ["You're ", "not ", "worthless", " — that's the anxiety talking."],
      benign,
    ));
    const h: NilaUiMessage[] = [{ role: "user", content: "I feel worthless lately" }];
    const r = await sendToNila(h, "companion", { onDelta: (t) => seen.push(t) });
    expect(r.reply).toBe(benign); // final gate keeps it (reframe ≠ distortion agreement)
    expect(seen.join("")).toBe(benign); // every token forwarded — guard did NOT cut a benign reframe
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S3 Phase 2 (U4) — RAG grounding: buildNilaSystem injects the most-relevant skills when the latest
// user message is known, but stays BYTE-IDENTICAL to the old prompt with no query (back-compat).
// ─────────────────────────────────────────────────────────────────────────────
describe("S3 RAG grounding — buildNilaSystem(query) is additive + back-compat", () => {
  it("no-query output is byte-identical (undefined === '' === no-arg)", () => {
    expect(buildNilaSystem()).toBe(buildNilaSystem(undefined));
    expect(buildNilaSystem()).toBe(buildNilaSystem(""));
  });
  it("a real query ADDS the grounding block; no-query does not", () => {
    const grounded = buildNilaSystem("I keep having the same negative automatic thought");
    expect(grounded).toContain("MOST RELEVANT");
    expect(grounded).toContain("Thought Record");
    expect(buildNilaSystem()).not.toContain("MOST RELEVANT");
    // additive: the full skills library list is still present in both
    expect(grounded).toContain("IN-APP SKILLS LIBRARY");
    expect(buildNilaSystem()).toContain("IN-APP SKILLS LIBRARY");
  });
});
