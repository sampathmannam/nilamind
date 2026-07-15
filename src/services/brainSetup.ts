// Tiny reactive store for whether the on-device brain is ready, or needs first-run setup (download).
// main.tsx (native) sets it after routing the backend; ModelSetupGate renders the setup screen when
// it's "needs-setup". Default "ready" → no gate on web/preview or until native says otherwise.

// Model download skip persistence: when the user taps "Skip for now", we record when they last
// skipped. On next cold launch, if a model is still missing but the user skipped within the last
// RE_PROMPT_DAYS, we silently pass through instead of showing the gate again. After the window
// expires, they get one fresh prompt. Non-sensitive (just a timestamp) — localStorage is fine.
const SKIP_STORAGE_KEY = "nilamind_model_download_skipped_at";
const RE_PROMPT_DAYS = 7;

function getSkippedAt(): number | null {
  try {
    const raw = localStorage.getItem(SKIP_STORAGE_KEY);
    if (!raw) return null;
    const ts = Number(raw);
    return Number.isFinite(ts) ? ts : null;
  } catch {
    return null;
  }
}

function setSkippedAt(ts: number): void {
  try {
    localStorage.setItem(SKIP_STORAGE_KEY, String(ts));
  } catch {
    // no-op (private browsing, quota full — degrade gracefully)
  }
}

export function recordModelDownloadSkipped(): void {
  setSkippedAt(Date.now());
}

export function shouldRespectModelDownloadSkip(): boolean {
  const skippedAt = getSkippedAt();
  if (!skippedAt) return false;
  const elapsedMs = Date.now() - skippedAt;
  return elapsedMs < RE_PROMPT_DAYS * 24 * 60 * 60 * 1000;
}

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
