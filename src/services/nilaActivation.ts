// nilaActivation — single controller that all three Nila triggers route through.
// Handles de-duplication (cooldown + call-open guard), chime synthesis, and event fan-out.
// Privacy: all state is in-memory, module-scoped; nothing is persisted or transmitted.

import { wakeWord } from "./wakeWord";

// ---------------------------------------------------------------------------
// Pure logic — unit-testable with no side effects
// ---------------------------------------------------------------------------

export function canSummon(s: {
  callOpen: boolean;
  now: number;
  lastSummonAt: number;
  cooldownMs?: number;
}): boolean {
  if (s.callOpen) return false;
  return s.now - s.lastSummonAt >= (s.cooldownMs ?? 1500);
}

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let callOpen = false;
let lastSummonAt = -Infinity;
const subs = new Set<() => void>();

// ---------------------------------------------------------------------------
// Chime — short, gentle two-note Web Audio tone synthesised in code.
//
// Design rationale (why not mp3):
//   • No binary asset to vet — critical for a mental-health companion where an
//     unexpected harsh sound would be jarring.
//   • Works identically in the browser preview and the Capacitor WebView
//     (both expose the Web Audio API).
//   • Tiny footprint; no network fetch, no APK bloat.
//
// Sound design: soft sine fade-in/fade-out at 880 Hz (A5) for 180 ms then
// 1174 Hz (D6) for 120 ms. Gain is capped at 0.18 so it's barely audible
// but perceptible — a calm "tap" rather than a chime.
// ---------------------------------------------------------------------------

function chime(): void {
  let ctx: AudioContext | undefined;
  try {
    ctx = new AudioContext();

    const playNote = (freq: number, startSec: number, durationSec: number) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      // Gentle ramp: 10 ms fade-in, hold, 30 ms fade-out
      const fadeIn = 0.01;
      const fadeOut = 0.03;
      gain.gain.setValueAtTime(0, ctx!.currentTime + startSec);
      gain.gain.linearRampToValueAtTime(0.18, ctx!.currentTime + startSec + fadeIn);
      gain.gain.setValueAtTime(0.18, ctx!.currentTime + startSec + durationSec - fadeOut);
      gain.gain.linearRampToValueAtTime(0, ctx!.currentTime + startSec + durationSec);

      osc.connect(gain);
      gain.connect(ctx!.destination);

      osc.start(ctx!.currentTime + startSec);
      osc.stop(ctx!.currentTime + startSec + durationSec);
    };

    // Note 1: A5 (880 Hz) for 180 ms, then Note 2: D6 (1174 Hz) for 120 ms
    playNote(880, 0, 0.18);
    playNote(1174, 0.19, 0.12);

    // Close the context once the notes are done to free resources
    setTimeout(() => {
      ctx!.close().catch(() => undefined);
    }, 400);
  } catch {
    // Web Audio not available (SSR / test env / very old WebView) — silently skip
    try { ctx?.close(); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Subscribe to Nila summon events. Returns an unsubscribe function. */
export function onSummon(cb: () => void): () => void {
  subs.add(cb);
  return () => { subs.delete(cb); };
}

/** Notify the controller that the call screen has opened or closed. */
export function setCallOpen(open: boolean): void {
  callOpen = open;
}

/**
 * Primary entry-point for wake word trigger.
 * De-duplicates via canSummon, plays the chime, and fans out to subscribers.
 */
export function summonNila(): void {
  const now = Date.now();
  if (!canSummon({ callOpen, now, lastSummonAt })) return;

  lastSummonAt = now;
  void wakeWord.stop(); // release the mic so the call screen's STT can use it
  chime();
  subs.forEach((cb) => cb());
}
