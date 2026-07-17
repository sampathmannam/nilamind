import { useCallback, useEffect, useRef, useState } from "react";
import { getBreathPattern, type BreathPattern } from "../services/breathPacer";

// Shared requestAnimationFrame breath-cycle driver, extracted 2026-07-17 QA from the byte-identical
// animation loops in BreathingScreen and BreathingTimer. Owns the elapsed-ms + cycle-index state and the
// RAF loop; `playingRef` keeps the loop from reading stale `playing`. Starting (playing → true) restarts
// from zero; stopping only cancels the frame (elapsed FREEZES on pause — matching both components). `reset`
// zeroes the clock explicitly (each component layers its own extra resets — e.g. the screen's phase/celebration
// state — on top). Pure timing only: no haptics, no rendering.
export function useBreathAnimation(
  pattern: BreathPattern,
  playing: boolean,
): { elapsed: number; cycleIdx: number; reset: () => void } {
  const [elapsed, setElapsed] = useState(0);
  const [cycleIdx, setCycleIdx] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const playingRef = useRef(false);

  // Keep the ref in sync so the animation loop never reads stale state.
  useEffect(() => { playingRef.current = playing; }, [playing]);

  const animate = useCallback((now: number) => {
    if (!startTimeRef.current) startTimeRef.current = now;
    const t = now - startTimeRef.current;
    const p = getBreathPattern(pattern);
    const totalMs = (p.inhale + p.inhale2 + p.hold + p.exhale + p.hold2) * 1000;
    const cyc = Math.floor(t / totalMs);
    setElapsed(t);
    setCycleIdx(cyc);
    if (playingRef.current) rafRef.current = requestAnimationFrame(animate);
  }, [pattern]);

  useEffect(() => {
    if (playing) {
      startTimeRef.current = 0;
      setElapsed(0);
      setCycleIdx(0);
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, animate]);

  const reset = useCallback(() => {
    setElapsed(0);
    setCycleIdx(0);
    startTimeRef.current = 0;
  }, []);

  return { elapsed, cycleIdx, reset };
}
