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
 */
export function applyOutputSafety(reply: string, userText: string, reachedAI: boolean): string {
  if (!reachedAI) return reply; // scripted offline fallback — never scan/replace
  try {
    return checkResponse(reply, userText) ? reply : getUnsafeFallbackReply();
  } catch {
    return getUnsafeFallbackReply(); // fail closed: never surface raw model text on a gate error
  }
}
