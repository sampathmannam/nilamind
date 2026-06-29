import { useEffect, useState } from "react";

// Reassurance copy for the wait while the on-device model produces a reply. That wait is legitimately
// long — the FIRST reply after a cold start page-faults the whole ~2.5 GB model in from flash and can
// take minutes (later turns reuse the KV cache and are quick). A bare "thinking…" sitting silent for
// minutes reads as broken, which is the last thing a distressed person needs. So the copy escalates with
// the wait: name presence early, then gently acknowledge the longer load — the wait feels HELD, not
// stalled. A fast reply never reaches these phases. The time→copy mapping is a PURE function (unit-tested);
// the hook is just its timer.

const PHASE1_MS = 6_000; // ~6s: every real reply passes this, so reassure presence
const PHASE2_MS = 45_000; // ~45s: only the slow (usually cold first) reply gets here

/** Pure: map the elapsed-wait phase (0/1/2) to the label. `base` is shown until the first threshold. */
export function settlingNoteFor(phase: number, base: string): string {
  if (phase >= 2) return "Still here — this one's taking a little longer.";
  if (phase >= 1) return "Nila's taking a moment — I'm right here.";
  return base;
}

/** While `active`, returns calm reassurance that escalates with the wait (base → presence → longer-load).
 *  Resets the moment a new wait starts; a reply that arrives fast only ever shows `base`. */
export function useSettlingNote(active: boolean, base: string): string {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    setPhase(0); // restart the escalation for this wait
    const t1 = setTimeout(() => setPhase(1), PHASE1_MS);
    const t2 = setTimeout(() => setPhase(2), PHASE2_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [active]);
  return settlingNoteFor(phase, base);
}
