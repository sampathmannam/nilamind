// Central serialization for ALL on-device model access.
//
// The shipped llama.cpp binding (llama-cpp-capacitor) runs completion() SYNCHRONOUSLY on Capacitor's single
// shared plugin thread, so two overlapping completions freeze the app and can corrupt the one model context.
// Guards scattered per-caller proved leaky (the text chat and the voice call each had their own in-flight
// flag but neither checked the other). This module is the ONE place that owns the model: every completion —
// chat, voice, reflection, coach, episode — acquires the lock here, so no two can ever overlap.
//
// Two acquire modes:
//   runExclusive(fn)     — QUEUE and wait your turn (PRIMARY callers: chat / voice; their turn is guaranteed).
//   tryRunExclusive(fn)  — run only if the lock is free RIGHT NOW, else return null (AUX best-effort callers:
//                          reflection / coach / episode — they degrade gracefully rather than pile up).

let active = 0; // sections queued-or-running; the lock is "busy" whenever this is > 0
let tail: Promise<unknown> = Promise.resolve();

/** True while any model section is queued or running — callers use it to avoid a 2nd concurrent completion. */
export function isModelBusy(): boolean {
  return active > 0;
}

/** Acquire the model lock, run fn to completion exclusively, then release — FIFO. Waits behind anyone ahead. */
export async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  active += 1;
  const prev = tail;
  let release!: () => void;
  tail = new Promise<void>((r) => { release = r; });
  try {
    await prev; // our turn only once everyone queued ahead of us has released
    return await fn();
  } finally {
    active -= 1;
    release();
  }
}

/** Run fn exclusively ONLY if the lock is free this instant; otherwise skip and resolve null (no queueing). */
export async function tryRunExclusive<T>(fn: () => Promise<T>): Promise<T | null> {
  // active is checked and runExclusive increments it with no await in between → atomic on the JS event loop.
  if (active > 0) return null;
  return runExclusive(fn);
}
