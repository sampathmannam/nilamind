// src/services/sendToNila.ts
// The single typed entry point for talking to Nila. Two modes keep SEPARATE send paths behind one
// signature so prompts/tools never blend:
//   companion -> askNilaLocalStream (on-device model + buildNilaSystem, streamed; routes to the user's
//                opt-in cloud tier at the localLlm seam when they enabled it in Settings)
//   episode   -> generateOnDevice with the EPISODE system instruction (+ last-5 episodes), no tools —
//                ALWAYS on-device, even with cloud enabled (episode records are sensitive derived data)
// The DEFAULT path is fully ON-DEVICE — cloud exists only as the user's explicit opt-in. With no brain
// available each mode returns the calm offline experience (never the network).
//
// Safety invariants enforced here via tested pure helpers:
//   #1 shouldBlockForCrisis() short-circuits BEFORE the model runs, in both modes.
//   #2 buildOutgoing() strips synthetic turns from the messages handed to the model.
//   #3 applyOutputSafety() runs checkResponse once on every reachedAI reply.
//   #4/#5 buildEpisodeSystem() substitutes [REGION_CRISIS_LINES]; on-device has no tools field at all.

import type { AgentView } from "./agent";
import type { NilaMessage } from "./nila";
import { secureLocal } from "./secureLocal";
import { EpisodeRecord } from "../types";
import { getCrisisReply, getUnsafeFallbackReply } from "../safety";
import { buildEpisodeSystem } from "./episodePrompt";
import { applyOutputSafety } from "./nilaSafetyGate";
import { isLocalLlmReady, generateOnDevice } from "./localLlm";
import { askNilaLocalStream } from "./localNila";
import { storeConversationMemory } from "./conversationMemory";
import { cleanResponse } from "./responseCleaner";
import {
  NilaMode,
  NilaUiMessage,
  buildOutgoing,
  lastUserText,
  crisisSignalForSend,
  createStreamGuard,
} from "./nilaSend";

export interface NilaSendResult {
  reply: string;
  reachedAI: boolean;
  blocked?: boolean;
  /** Which §9 floor caught it — only set when blocked===true. "keyword" = deterministic floor. "classifier" =
   *  a probabilistic-only hit (either tier — see crisisTier for which). 2026-07-12 Wave 3. */
  crisisSource?: "keyword" | "classifier";
  /** Which UI surface this hit should render — only set when blocked===true. "full" = full-takeover
   *  CrisisOverlay (unconditional for a keyword-floor hit; also a HIGH-CONFIDENCE classifier hit). "soft" =
   *  inline SoftCrisisCard (a classifier hit that clears the base gate but not the higher-confidence bar).
   *  2026-07-12 Bug 1 fix — this, NOT crisisSource, is what the UI must branch on. */
  crisisTier?: "full" | "soft";
  navigate?: AgentView;
  openSkillId?: string;
}

/** Matches "what is/'s my name", "do you know my name", "tell me my name" — the deterministic name
 *  guard below (2026-07-12 device-QA: no name store exists, so the model fabricated one). Exported for
 *  tests. */
export const NAME_QUESTION_RE = /\b(what('s| is) my name|do you know my name|tell me my name)\b/i;

/** Last 5 saved episodes, read from the encrypted store exactly as the old episode screen did. */
function loadRecentEpisodes(): EpisodeRecord[] {
  try {
    const raw = secureLocal.getItem("nilamind_episodes");
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? (list as EpisodeRecord[]) : [];
  } catch {
    return [];
  }
}

export async function sendToNila(
  history: NilaUiMessage[],
  mode: NilaMode,
  opts: { onDelta: (t: string) => void }
): Promise<NilaSendResult> {
  const userText = lastUserText(history);

  // INVARIANT 1 — crisis scan before any model call, both modes. Keyword floor OR the on-device classifier
  // (additive; classifier off by default until device-verified → identical to the keyword gate). Source- AND
  // tier-aware (2026-07-12 Wave 3; retiered 2026-07-12 Bug 1 fix) so ModeScreen can render the two-tier
  // surface off of `tier` (the field that actually reflects confidence — see crisisClassifier.ts's
  // CrisisSource/CrisisTier docs for why source alone must never drive the UI decision). `?? "keyword"` /
  // `?? "full"` are fail-closed fallbacks — if `hit` is ever true with a null source/tier, default to the
  // MORE severe (full-takeover) surface, never less.
  const crisisSignal = await crisisSignalForSend(userText);
  if (crisisSignal.hit) {
    return {
      reply: getCrisisReply(),
      reachedAI: false,
      blocked: true,
      crisisSource: crisisSignal.source ?? "keyword",
      crisisTier: crisisSignal.tier ?? "full",
    };
  }

  const outgoing = buildOutgoing(history); // INVARIANT 2 — synthetic turns stripped

  if (mode === "companion") {
    // Deterministic trust guard (2026-07-12 device-QA): with no name store in the app, the on-device model
    // invented a user name ("Nilah") from a vocative "…, nila" and asserted it confidently. There is no
    // mechanism by which Nila can legitimately know a name (no name field in nilaProfile), so "what is my
    // name" gets a warm, honest, deterministic answer instead of a fabrication-prone generation.
    if (NAME_QUESTION_RE.test(userText)) {
      return {
        reply: "You know, you haven't told me your name yet — I'd love to know what you'd like me to call you.",
        reachedAI: false,
        blocked: false,
      };
    }

    // Stream guard: suppress unsafe tokens LIVE (method + "how to") before they render. The broad
    // final gate (applyOutputSafety) still runs on the finished reply as the authority.
    const guard = createStreamGuard(opts.onDelta);
    // ON-DEVICE by default; the user's opt-in cloud tier (Settings) is routed beneath this at the
    // localLlm seam. When no brain is available the chat returns the offline experience (grounding /
    // tools / crisis), never the network. The §9 stream guard + output gate wrap whatever the model —
    // local or cloud — produces, so safety is identical on both paths.
    if (!isLocalLlmReady()) return { reply: "", reachedAI: false };
    const r = await askNilaLocalStream(outgoing as NilaMessage[], { onDelta: guard.onDelta });
    if (r.reachedAI) {
      if (guard.tripped()) {
        // Unsafe output was suppressed mid-stream — do NOT honor the model's tool-driven UI side
        // effects (navigate / open skill) for an unsafe turn. Return only the safe fallback.
        return { reply: getUnsafeFallbackReply(), reachedAI: true };
      }
      const cleaned = cleanResponse(r.reply);
      const safe = applyOutputSafety(cleaned, userText, true); // INVARIANT 3
      storeConversationMemory(userText, safe); // Lever 6: store for future retrieval
      return { reply: safe, reachedAI: true, navigate: r.navigate, openSkillId: r.openSkillId };
    }
    return { reply: r.reply, reachedAI: false, navigate: r.navigate, openSkillId: r.openSkillId };
  }

  // episode — ON-DEVICE, unified companion persona + episode steer, no tools (=> INVARIANT 5).
  // Streams behind the §9 guard; with no model loaded it returns the offline experience, never the network.
  const systemInstruction = buildEpisodeSystem(loadRecentEpisodes(), userText); // INVARIANT 4 substitution inside
  const guard = createStreamGuard(opts.onDelta);
  // wait:true — episode is a PRIMARY user conversation, so it waits its turn on the model lock instead of
  // skipping-if-busy (which would drop a user mid-episode to the offline walkthrough).
  const reply = (await generateOnDevice(systemInstruction, outgoing as NilaMessage[], guard.onDelta, undefined, { wait: true })) ?? "";
  if (!reply) return { reply: "", reachedAI: false };
  if (guard.tripped()) return { reply: getUnsafeFallbackReply(), reachedAI: true };
  const safe = applyOutputSafety(reply, userText, true); // INVARIANT 3
  return { reply: safe, reachedAI: true };
}
