// src/services/sendToNila.ts
// The single typed entry point for talking to Nila. Two modes keep SEPARATE send paths behind one
// signature so prompts/tools never blend:
//   companion -> askNilaLocalStream (on-device Gemma + buildNilaSystem, streamed)
//   episode   -> generateOnDevice with the EPISODE system instruction (+ last-5 episodes), no tools
// Both run fully ON-DEVICE — there is no cloud transport. With no model loaded each mode returns the
// calm offline experience (never the network).
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
import {
  NilaMode,
  NilaUiMessage,
  buildOutgoing,
  lastUserText,
  shouldBlockForCrisisAsync,
  createStreamGuard,
} from "./nilaSend";

export interface NilaSendResult {
  reply: string;
  reachedAI: boolean;
  blocked?: boolean;
  navigate?: AgentView;
  openSkillId?: string;
}

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
  // (additive; classifier off by default until device-verified → identical to the keyword gate).
  if (await shouldBlockForCrisisAsync(userText)) {
    return { reply: getCrisisReply(), reachedAI: false, blocked: true };
  }

  const outgoing = buildOutgoing(history); // INVARIANT 2 — synthetic turns stripped

  if (mode === "companion") {
    // Stream guard: suppress unsafe tokens LIVE (method + "how to") before they render. The broad
    // final gate (applyOutputSafety) still runs on the finished reply as the authority.
    const guard = createStreamGuard(opts.onDelta);
    // ON-DEVICE ONLY — Nila has no cloud brain. When no model is loaded the chat returns the offline
    // experience (grounding / tools / crisis), never the network. The §9 stream guard + output gate
    // still wrap whatever the local model produces.
    if (!isLocalLlmReady()) return { reply: "", reachedAI: false };
    const r = await askNilaLocalStream(outgoing as NilaMessage[], { onDelta: guard.onDelta });
    if (r.reachedAI) {
      if (guard.tripped()) {
        // Unsafe output was suppressed mid-stream — do NOT honor the model's tool-driven UI side
        // effects (navigate / open skill) for an unsafe turn. Return only the safe fallback.
        return { reply: getUnsafeFallbackReply(), reachedAI: true };
      }
      const safe = applyOutputSafety(r.reply, userText, true); // INVARIANT 3
      return { reply: safe, reachedAI: true, navigate: r.navigate, openSkillId: r.openSkillId };
    }
    return { reply: r.reply, reachedAI: false, navigate: r.navigate, openSkillId: r.openSkillId };
  }

  // episode — ON-DEVICE, EPISODE prompt, no tools (=> INVARIANT 5). Streams behind the §9 guard; with
  // no model loaded it returns the offline experience, never the network.
  const systemInstruction = buildEpisodeSystem(loadRecentEpisodes()); // INVARIANT 4 substitution inside
  const guard = createStreamGuard(opts.onDelta);
  const reply = (await generateOnDevice(systemInstruction, outgoing as NilaMessage[], guard.onDelta)) ?? "";
  if (!reply) return { reply: "", reachedAI: false };
  if (guard.tripped()) return { reply: getUnsafeFallbackReply(), reachedAI: true };
  const safe = applyOutputSafety(reply, userText, true); // INVARIANT 3
  return { reply: safe, reachedAI: true };
}
