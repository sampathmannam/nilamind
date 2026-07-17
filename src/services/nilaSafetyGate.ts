// src/services/nilaSafetyGate.ts
// The single output-safety gate for every Nila transport (stream finalize, non-stream, episode /chat).
// INVARIANT 3: checkResponse runs exactly once on the authoritative final text for every reachedAI
// reply; scripted offline fallback (reachedAI=false) is left untouched.

import { checkResponse, getUnsafeFallbackReply } from "../safety";

/**
 * Apply output safety checking to an AI reply.
 *
 * - reachedAI=true  → runs checkResponse(reply, userText) once; returns getUnsafeFallbackReply()
 *                     if unsafe (checkResponse returns false), otherwise returns reply unchanged.
 * - reachedAI=false → scripted offline fallback; pre-vetted; skips scan and returns reply unchanged.
 *
 * checkResponse semantics: returns true when the reply is SAFE, false when UNSAFE.
 *
 * `userInCrisis` threads the send path's already-computed crisis verdict (keyword floor OR classifier) into
 * checkResponse's Rule 1 (a reply to a person in crisis MUST surface a crisis resource). Without it,
 * checkResponse falls back to the keyword floor alone — so a SOFT-tier, classifier-only disclosure (the ~40%
 * the classifier catches that keywords miss) never triggered Rule 1 (2026-07-17 QA: the param existed but no
 * caller passed it). Callers with no pre-computed verdict omit it and keep the keyword-floor fallback.
 */
export function applyOutputSafety(reply: string, userText: string, reachedAI: boolean, userInCrisis?: boolean): string {
  if (!reachedAI) return reply; // scripted offline fallback — never scan/replace
  try {
    return checkResponse(reply, userText, userInCrisis) ? reply : getUnsafeFallbackReply();
  } catch {
    return getUnsafeFallbackReply(); // fail closed: never surface raw model text on a gate error
  }
}
