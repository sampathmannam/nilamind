// Tiny reactive store for whether the on-device brain is ready, or needs first-run setup (download).
// main.tsx (native) sets it after routing the backend; ModelSetupGate renders the setup screen when
// it's "needs-setup". Default "ready" → no gate on web/preview or until native says otherwise.
export type BrainStatus = "ready" | "needs-setup";

let status: BrainStatus = "ready";
const listeners = new Set<() => void>();

export function getBrainStatus(): BrainStatus {
  return status;
}

export function setBrainStatus(s: BrainStatus): void {
  if (s === status) return;
  status = s;
  listeners.forEach((l) => l());
}

export function subscribeBrain(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
