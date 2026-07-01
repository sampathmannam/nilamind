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
const PHASE3_MS = 90_000; // ~90s: the very first reply after setup pages the whole model in — can be minutes

/** Pure: map the elapsed-wait phase (0/1/2/3) to the label. `base` is shown until the first threshold.
 *  Phase 3 is reached only by the first cold reply after setup: it honestly names the "few minutes" wait
 *  (so a 2–4 min load never reads as frozen) and points to grounding/breathing to do meanwhile. */
export function settlingNoteFor(phase: number, base: string): string {
  if (phase >= 3) return "Still with you — the very first reply after setup can take a few minutes while Nila loads. Nothing's stuck. If it helps, try a grounding or breathing exercise while you wait.";
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
    const t3 = setTimeout(() => setPhase(3), PHASE3_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active]);
  return settlingNoteFor(phase, base);
}
