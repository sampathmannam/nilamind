import { describe, it, expect, vi } from "vitest";
import {
  shouldBlockForCrisis,
  buildOutgoing,
  lastUserText,
  NilaUiMessage,
  createStreamGuard,
  resolveStreamedVoiceReply,
} from "./nilaSend";
import { getUnsafeFallbackReply } from "../safety";

describe("shouldBlockForCrisis", () => {
  it("is true for a SUICIDAL_KEYWORDS phrase (crisis text must never leave device)", () => {
    expect(shouldBlockForCrisis("I want to die")).toBe(true);
  });
  it("is true for self-harm phrasing", () => {
    expect(shouldBlockForCrisis("I keep thinking about cutting myself")).toBe(true);
  });
  it("is false for ordinary distress", () => {
    expect(shouldBlockForCrisis("I'm really anxious about work")).toBe(false);
  });
  it("is false for empty input", () => {
    expect(shouldBlockForCrisis("")).toBe(false);
  });
});

describe("buildOutgoing", () => {
  it("drops synthetic turns from the wire payload", () => {
    const history: NilaUiMessage[] = [
      { role: "user", content: "everything is racing" },
      { role: "assistant", content: "how intense is it 1-10?", synthetic: true },
      { role: "assistant", content: "Logged current intensity: 8/10.", synthetic: true },
      { role: "assistant", content: "That pain is real." },
      { role: "user", content: "still bad" },
    ];
    const wire = buildOutgoing(history);
    expect(wire).toEqual([
      { role: "user", content: "everything is racing" },
      { role: "assistant", content: "That pain is real." },
      { role: "user", content: "still bad" },
    ]);
  });
  it("never emits a synthetic flag on any outgoing message", () => {
    const history: NilaUiMessage[] = [{ role: "user", content: "hi", synthetic: false }];
    const wire = buildOutgoing(history);
    expect(wire.every((m) => !("synthetic" in m))).toBe(true);
  });
  it("passes plain history through unchanged in shape", () => {
    const history: NilaUiMessage[] = [{ role: "user", content: "hello" }];
    expect(buildOutgoing(history)).toEqual([{ role: "user", content: "hello" }]);
  });
});

describe("lastUserText", () => {
  it("returns the most recent non-synthetic user content", () => {
    const history: NilaUiMessage[] = [
      { role: "user", content: "first" },
      { role: "assistant", content: "reply" },
      { role: "user", content: "second" },
      { role: "assistant", content: "what is your intensity?", synthetic: true },
    ];
    expect(lastUserText(history)).toBe("second");
  });
  it("ignores synthetic user turns", () => {
    const history: NilaUiMessage[] = [
      { role: "user", content: "real one" },
      { role: "user", content: "Logged current intensity: 8/10.", synthetic: true },
    ];
    expect(lastUserText(history)).toBe("real one");
  });
  it("returns empty string when there is no user turn", () => {
    expect(lastUserText([{ role: "assistant", content: "hi" }])).toBe("");
  });
});

describe("createStreamGuard", () => {
  it("forwards all deltas for a benign stream and never trips", () => {
    const seen: string[] = [];
    const g = createStreamGuard((t) => seen.push(t));
    ["You ", "matter. ", "Let's breathe."].forEach(g.onDelta);
    expect(seen.join("")).toBe("You matter. Let's breathe.");
    expect(g.tripped()).toBe(false);
  });

  it("trips when the buffer crosses into method + 'how to', suppresses the triggering and all later deltas, fires onTrip once", () => {
    const seen: string[] = [];
    const trip = vi.fn();
    const g = createStreamGuard((t) => seen.push(t), trip);
    ["Sure, ", "here is how to ", "overdose", " step by step", " more"].forEach(g.onDelta);
    expect(g.tripped()).toBe(true);
    expect(trip).toHaveBeenCalledTimes(1);
    // pre-harm deltas forwarded (buffer benign until "overdose" completed "how to"+method);
    // the triggering delta ("overdose") + all later deltas suppressed.
    expect(seen.join("")).toBe("Sure, here is how to ");
    g.onDelta("even more"); // post-trip
    expect(trip).toHaveBeenCalledTimes(1);
    expect(seen.join("")).toBe("Sure, here is how to ");
  });

  it("suppresses a single whole-reply delta that is harmful", () => {
    const seen: string[] = [];
    const g = createStreamGuard((t) => seen.push(t));
    g.onDelta("here is how to overdose in detail");
    expect(g.tripped()).toBe(true);
    expect(seen.join("")).toBe("");
  });

  it("does NOT trip on a benign CBT reframe containing a distortion substring (guard is method+how-to only)", () => {
    const seen: string[] = [];
    const g = createStreamGuard((t) => seen.push(t));
    ["You're ", "not ", "worthless", " — that's the anxiety talking."].forEach(g.onDelta);
    expect(g.tripped()).toBe(false);
    expect(seen.join("")).toContain("worthless");
  });

  it("does NOT trip on a warm 'try to hang in there' (looser cues never cut live)", () => {
    const seen: string[] = [];
    const g = createStreamGuard((t) => seen.push(t));
    ["Try ", "to ", "hang ", "in there, okay?"].forEach(g.onDelta);
    expect(g.tripped()).toBe(false);
    expect(seen.join("")).toBe("Try to hang in there, okay?");
  });
});

describe("resolveStreamedVoiceReply", () => {
  const base = { reply: "ok", shown: "ok", tripped: false, userText: "hi", offlineLine: "OFFLINE" };
  it("offline → offline line, fresh speak", () => {
    expect(resolveStreamedVoiceReply({ ...base, reachedAI: false })).toEqual({ line: "OFFLINE", needsFreshSpeak: true });
  });
  it("tripped → unsafe fallback, fresh speak", () => {
    expect(resolveStreamedVoiceReply({ ...base, reachedAI: true, tripped: true }))
      .toEqual({ line: getUnsafeFallbackReply(), needsFreshSpeak: true });
  });
  it("unsafe final reply → fallback, fresh speak", () => {
    const d = resolveStreamedVoiceReply({ ...base, reachedAI: true, reply: "you are worthless", shown: "you are worthless", userText: "I feel low" });
    expect(d).toEqual({ line: getUnsafeFallbackReply(), needsFreshSpeak: true });
  });
  it("safe reply already streamed → no fresh speak", () => {
    const d = resolveStreamedVoiceReply({ ...base, reachedAI: true, reply: "You matter.", shown: "You matter.", userText: "I feel low" });
    expect(d).toEqual({ line: "You matter.", needsFreshSpeak: false });
  });
  it("fails closed when checkResponse throws (voice path)", async () => {
    vi.resetModules();
    vi.doMock("../safety", async () => {
      const actual = await vi.importActual<typeof import("../safety")>("../safety");
      return { ...actual, checkResponse: () => { throw new Error("boom"); } };
    });
    const { resolveStreamedVoiceReply: resolve } = await import("./nilaSend");
    const { getUnsafeFallbackReply: fb } = await import("../safety");
    const d = resolve({ reachedAI: true, reply: "RAW", shown: "RAW", tripped: false, userText: "hi", offlineLine: "OFFLINE" });
    expect(d).toEqual({ line: fb(), needsFreshSpeak: true });
    vi.doUnmock("../safety");
    vi.resetModules();
  });
});
