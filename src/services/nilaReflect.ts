// nilaReflect — the deterministic, LLM-free "Nila listens" backend for the WEB front door (rung 0).
//
// A small on-device model can't run in a browser, so on web there is no llama.cpp brain. But the app's
// help was never the model's job (see the role-split in README): the deterministic tools + §9 carry it.
// All that's missing on web is the *warmth* — a brief reflection so Nila doesn't sit silent. This module
// provides exactly that, with NO network and NO model: reflective-listening scripts keyed to the stated
// feeling. It registers through the existing localLlm seam (registerLocalLlmBackend), so §9's output gate
// and the tool-card dispatch still run on whatever it returns — the reflection is warmth, the app is help.
//
// Invariants (locked by nilaReflect.test.ts):
//  · never CLAIM shared lived experience (a script has no right to "I know how you feel")
//  · reflect the stated feeling back (validation, not a generic canned line)
//  · never repeat the same opening stem twice in a session (feels human, not a bot on loop)
//  · always end on a gentle opening (an invitation to a small next step the app then surfaces)
//  · data-fence the user's own echoed words (the same in-band-injection discipline as episodePrompt.ts)

import type { LocalLlmBackend, LocalGenParams } from "./localLlm";
import { mapEmotion } from "./emotionParse";
import { enhancedOfflineReply } from "./enhancedOffline";

// Reflective-listening openers per emotion family. Each VALIDATES a state; none claims to have lived it.
// The `{f}` slot is filled with the mapped feeling word, lower-cased, so the reflection names it back.
const STEMS: Record<string, string[]> = {
  Anxious: [
    "It sounds like there's a lot of anxious energy in you right now",
    "That anxious, wound-up feeling sounds really hard to sit with",
    "It makes sense that feeling this anxious is taking up so much space",
    "Feeling this anxious sounds like a lot to hold",
  ],
  Low: [
    "It sounds like everything feels heavy and low right now",
    "That low, flat weight sounds exhausting to carry",
    "It makes sense to feel this low when things have been so much",
    "Feeling this low sounds really draining",
  ],
  Sad: [
    "It sounds like there's a deep sadness in you right now",
    "That sadness sounds like a lot to hold on your own",
    "It makes sense that this sadness hurts the way it does",
    "There's real sadness in what you're describing",
  ],
  Angry: [
    "It sounds like you're really angry right now, and it has a reason",
    "That angry, built-up feeling sounds like it's been there a while",
    "It makes sense to feel angry when something matters this much",
    "Feeling this angry sounds like a lot of heat to carry",
  ],
  Numb: [
    "It sounds like things feel numb and far away right now",
    "That empty, numb feeling sounds hard to be inside of",
    "It makes sense to feel numb when you're this worn down",
    "Feeling this numb sounds like a heavy kind of quiet",
  ],
  Overwhelmed: [
    "It sounds like you're really overwhelmed, with too much landing at once",
    "That overwhelmed, no-room-to-breathe feeling sounds crushing",
    "It makes sense to feel overwhelmed when this much is piled up",
    "Feeling this overwhelmed sounds like a lot to carry alone",
  ],
  Okay: [
    "It sounds like you're holding steady, even if it's tender",
    "It's good to hear you're feeling okay right now",
    "That sounds like a steadier place to be, for now",
    "It sounds like there's a bit more room to breathe today",
  ],
  Calm: [
    "It sounds like there's some calm in you right now",
    "That steadier, calmer feeling sounds like a relief",
    "It's good to hear things feel a little more settled",
    "There's a quiet in how you're describing it",
  ],
};

// Fallback pool when the feeling doesn't map to a known family — validate WITHOUT naming a wrong emotion.
const GENERIC_STEMS = [
  "It sounds like a lot is going on for you right now",
  "That sounds really hard to be carrying",
  "It makes sense that this is weighing on you",
  "There's a lot in what you just said",
];

// Gentle openings — never a full stop. Non-specific on purpose: the app surfaces the RIGHT tool as a
// tappable card, so the text invites without naming a tool that might not match the card.
const OPENERS = [
  "Do you want to stay with that for a moment together?",
  "Would it help to try one small thing right now?",
  "Can I stay here with you for a bit?",
  "Is it okay if we take the next minute slowly?",
  "Want to do something small together to take the edge off?",
];

function pickRotating(pool: string[], used: Set<string>): string {
  const fresh = pool.filter((s) => !used.has(s));
  const options = fresh.length > 0 ? fresh : pool; // pool exhausted → reset gracefully (still no repeat-in-a-row bias)
  if (fresh.length === 0) used.clear();
  // Deterministic rotation (no Math.random — banned in this env and makes tests flaky): first unused.
  const choice = options[0];
  used.add(choice);
  return choice;
}

/** Create a stateful reflector: successive calls rotate stems so a session never hears the same opener
 *  twice while options remain. One instance per page session (held by the backend below). */
export function makeReflector(): (text: string) => string {
  const usedStems = new Map<string, Set<string>>();
  const usedOpeners = new Set<string>();
  return (text: string): string => {
    const feeling = mapEmotion(text);
    const family = feeling && STEMS[feeling] ? feeling : "";
    const pool = family ? STEMS[family] : GENERIC_STEMS;
    const key = family || "_generic";
    if (!usedStems.has(key)) usedStems.set(key, new Set());
    const stem = pickRotating(pool, usedStems.get(key)!);
    const opener = pickRotating(OPENERS, usedOpeners);
    return `${stem}. ${opener}`;
  };
}

/** Warm offline/cold-start fallback (2026-07-06 audit). When the on-device model isn't ready — native cold
 *  load (can take minutes), OOM, or web — reflect the user's feeling via the LLM-free reflector instead of a
 *  single static "model isn't ready" sentence, then gently note the tools are here. A large fraction of FIRST
 *  messages hit this, so it must feel like Nila listening, not an error wall. §9's output gate still runs. */
export function offlineFallbackReply(userText: string): string {
  // Enhanced offline: use emotionally-aware scripted responses
  try { return enhancedOfflineReply(userText); } catch { /* fallback */ }
  const reflection = makeReflector()(userText);
  return `${reflection}\n\nMy on-device voice is still waking up — but I'm here, and your grounding and safety tools are ready any time, just below.`;
}

/** The web LLM-seam backend. Registered from main.tsx on web so isLocalLlmReady() becomes true and
 *  sendToNila routes here instead of returning the silent-offline empty reply. */
export function createReflectBackend(): LocalLlmBackend {
  const reflect = makeReflector();
  return {
    id: "nila-reflect-template",
    isReady: () => true,
    async generate({ messages, onToken, signal }: LocalGenParams): Promise<string> {
      const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
      const reply = reflect(lastUser);
      // Stream word-by-word so it feels typed, not pasted. Cheap, and honours an abort signal.
      for (const tok of reply.split(/(\s+)/)) {
        if (signal?.aborted) break;
        onToken(tok);
      }
      return reply;
    },
  };
}
