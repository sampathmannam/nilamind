import { describe, it, expect, vi, beforeEach } from "vitest";

// End-to-end proof for the HIGH-severity code-review finding "the voice call is silent": on Android the
// llama.cpp binding emits NO token events, so the adapter calls onToken ONCE with the whole reply (the
// fix). This test wires the SAME three real collaborators CallNilaScreen uses (createStreamGuard ->
// createSpeechQueue, then resolveStreamedVoiceReply) and feeds the reply in that exact Android shape,
// asserting it reaches the native speak() — and a regression test pinning the silent-bug behaviour.

const speakCalls: { text: string }[] = [];

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => "web" },
}));
vi.mock("@capacitor-community/text-to-speech", () => ({
  TextToSpeech: {
    speak: vi.fn(async (o: { text: string }) => { speakCalls.push({ text: o.text }); }),
    stop: vi.fn(async () => {}),
    getSupportedVoices: vi.fn(async () => ({ voices: [] })),
  },
}));
vi.mock("@capacitor-community/speech-recognition", () => ({ SpeechRecognition: {} }));
vi.mock("./afHeartVoice", () => ({
  speakAfHeart: vi.fn(async () => false),
  stopAfHeart: vi.fn(() => {}),
  AF_HEART_ID: "af_heart",
}));

import { createSpeechQueue } from "./voice";
import { createStreamGuard, resolveStreamedVoiceReply } from "./nilaSend";

const USER = "i feel anxious";
const OFFLINE = "offline line";

// Run one CallNilaScreen turn against a backend that delivers `reply` the way the on-device adapter does:
// `deltas` is the sequence of onToken calls (Android = one call with the whole reply; pre-fix bug = none).
async function runTurn(reply: string, deltas: string[]) {
  speakCalls.length = 0;
  const queue = createSpeechQueue();
  let shown = "";
  const guard = createStreamGuard(
    (t) => { shown += t; queue.push(t); },
    () => queue.cancel(),
  );
  for (const d of deltas) guard.onDelta(d); // the adapter's onToken feed
  const decision = resolveStreamedVoiceReply({
    reachedAI: true, reply, shown, tripped: guard.tripped(), userText: USER, offlineLine: OFFLINE,
  });
  if (decision.needsFreshSpeak) {
    queue.cancel();
    await import("./voice").then((v) => v.speak(decision.line)); // component speaks the fallback fresh
  } else {
    await queue.flush(); // component finishes the streamed reply
  }
  return { decision, spoken: speakCalls.map((c) => c.text).join(" ") };
}

describe("voice call speaks the reply (code-review finding 1/2: silent call)", () => {
  beforeEach(() => { speakCalls.length = 0; });

  it("FIX: a non-streamed reply (one onToken with the full text) is spoken via TTS", async () => {
    const reply = "I hear you. That sounds really heavy. I'm right here with you.";
    const { decision, spoken } = await runTurn(reply, [reply]); // Android: one onToken call
    expect(decision.needsFreshSpeak).toBe(false); // clean reply already fed to the queue
    expect(spoken).toContain("I hear you");
    expect(spoken).toContain("right here with you");
  });

  it("REGRESSION: with NO onToken feed (the pre-fix bug) a clean reply is totally silent", async () => {
    const reply = "I hear you. That sounds really heavy.";
    const { decision, spoken } = await runTurn(reply, []); // bug: nothing streamed, nothing fed
    // The resolver trusts a clean reply already streamed, so it does NOT re-speak...
    expect(decision.needsFreshSpeak).toBe(false);
    // ...and nothing was ever queued -> the user hears silence. This is the bug the fix removes.
    expect(spoken).toBe("");
  });
});
