// src/services/nilaSend.ts
// Pure transport-shaping + crisis-gate helpers shared by Nila's two send paths (companion + episode).
// Extracted so the §9 safety invariants are unit-testable in the node Vitest env (no React, no fetch).
//
// INVARIANT 1: shouldBlockForCrisis() wraps scanForCrisis so the unified send path can short-circuit
//   BEFORE any network call, in both modes. Crisis text never leaves the device.
// INVARIANT 2: buildOutgoing() strips UI-only synthetic turns (intensity prompts, "Logged current
//   intensity: N/10.") so they never appear in a request body.

import { scanForCrisis, isStreamingHarm, checkResponse, getUnsafeFallbackReply } from "../safety";
import { detectCrisis } from "./crisisClassifier";

export type NilaMode = "companion" | "episode";

export interface NilaUiMessage {
  role: "user" | "assistant";
  content: string;
  /** UI-only artifact (intensity prompt / "Logged current intensity"); never sent on the wire. */
  synthetic?: boolean;
}

export interface WireMessage {
  role: "user" | "assistant";
  content: string;
}

/** Deterministic, offline keyword crisis gate — the universal fail-closed FLOOR. Sync; never regresses. */
export function shouldBlockForCrisis(text: string): boolean {
  return scanForCrisis(text);
}

/**
 * The classifier-augmented crisis gate: keyword scan OR the on-device semantic classifier (Track B). Async
 * because the classifier embeds the text on-device. With the classifier OFF — the shipped default until it is
 * device-verified — this returns EXACTLY shouldBlockForCrisis (same keyword result, just awaited). When
 * enabled it additionally catches the euphemistic crises the keyword list misses (~40% of real disclosures).
 * Fail-closed: any classifier error degrades to the keyword result. Use this on the send path.
 */
export function shouldBlockForCrisisAsync(text: string): Promise<boolean> {
  return detectCrisis(text);
}

/** The exact message array to send to the on-device model: synthetic turns removed, synthetic flag dropped. */
export function buildOutgoing(history: NilaUiMessage[]): WireMessage[] {
  return history
    .filter((m) => m.synthetic !== true)
    .map((m) => ({ role: m.role, content: m.content }));
}

/** The last real (non-synthetic) user message — the authoritative text for the crisis/output scans. */
export function lastUserText(history: NilaUiMessage[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role === "user" && m.synthetic !== true) return m.content;
  }
  return "";
}

export interface StreamGuard {
  onDelta: (t: string) => void;
  tripped: () => boolean;
}

/**
 * Wrap a streaming onDelta so unsafe model tokens are never shown/spoken: accumulates the buffer, scans
 * BEFORE forwarding, and once isStreamingHarm (method + "how to") appears, fires onTrip once and
 * suppresses the triggering delta and all later deltas. Deliberately uses the STRICT predicate (not
 * checkResponse) so warm phrases ("try to hang in there") and CBT reframes are never cut live. The broad
 * final gate (checkResponse / applyOutputSafety) still runs on the finished reply as the authority.
 */
export function createStreamGuard(realOnDelta: (t: string) => void, onTrip?: () => void): StreamGuard {
  let buf = "";
  let trip = false;
  return {
    onDelta(t: string) {
      if (trip) return; // already tripped — suppress every later delta
      buf += t;
      if (isStreamingHarm(buf)) {
        trip = true;
        onTrip?.(); // fires exactly once
        return; // suppress the triggering delta too
      }
      realOnDelta(t);
    },
    tripped: () => trip,
  };
}

export interface VoiceReplyDecision {
  line: string;
  needsFreshSpeak: boolean;
}

/**
 * Decide the authoritative voice reply after a stream. Fail-closed: a tripped guard, an unsafe final
 * reply, an empty reply, or a gate error all yield the unsafe fallback (which the caller must speak
 * fresh, since the streamed line was cut/suppressed); a clean reply that already streamed needs no
 * re-speak. Pure — the component performs the speak/queue side effects.
 */
export function resolveStreamedVoiceReply(opts: {
  reachedAI: boolean;
  reply: string;
  shown: string;
  tripped: boolean;
  userText: string;
  offlineLine: string;
}): VoiceReplyDecision {
  const { reachedAI, reply, shown, tripped, userText, offlineLine } = opts;
  if (!reachedAI) return { line: offlineLine, needsFreshSpeak: true };
  if (tripped) return { line: getUnsafeFallbackReply(), needsFreshSpeak: true };
  const line = reply || shown;
  try {
    if (!line || !checkResponse(line, userText)) return { line: getUnsafeFallbackReply(), needsFreshSpeak: true };
  } catch {
    return { line: getUnsafeFallbackReply(), needsFreshSpeak: true };
  }
  return { line, needsFreshSpeak: false };
}
