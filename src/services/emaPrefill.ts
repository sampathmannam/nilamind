// One-shot in-memory handoff from the Home mood strip to EmaCheckIn (redesign §5.1,
// docs/superpowers/specs/2026-08-06-less-is-more-redesign-design.md). The tapped face IS the
// valence answer — the check-in must not re-ask it. In-memory only: a mood tap is not persisted
// until the person completes the check-in (no new storage key, nothing to encrypt or migrate).
let pending: number | null = null;

export function setEmaPrefill(valence: number): void {
  pending = valence;
}

/** Returns the pending valence once, then clears it. */
export function consumeEmaPrefill(): number | null {
  const v = pending;
  pending = null;
  return v;
}
