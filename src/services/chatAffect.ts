import { secureLocal } from "./secureLocal";

// Write-only latch for the most recent per-turn blended affect reading — Phase 1 of
// docs/superpowers/specs/2026-07-19-orb-affect-accent-design.md. Structurally mirrors
// chatElevation.ts's latch pattern. NOTHING READS THIS YET: no reader is exported here on purpose —
// modeEngine.ts's UserState fold and the compounding-memory digest are Phase 2, out of scope for this
// plan, and must carry the same "never overrides explicit self-report" invariant every other fold in
// modeEngine.ts already states before they're allowed to consume this.
const KEY = "nilamind_chat_affect";

interface AffectReading {
  valence: number;
  arousal: number;
  at: number;
}

/** Persist the latest per-turn blended affect reading. Best-effort — a missed write only means a
 *  future Phase-2 consumer sees a stale/absent reading; it never affects the accent's own render
 *  decision (that reads the value passed down the same turn, not this store). */
export function noteChatAffect(reading: { valence: number; arousal: number }, now: number = Date.now()): void {
  try {
    secureLocal.setItem(KEY, JSON.stringify({ valence: reading.valence, arousal: reading.arousal, at: now } satisfies AffectReading));
  } catch {
    /* best-effort */
  }
}
