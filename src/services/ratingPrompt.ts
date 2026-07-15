// Play Store rating prompt — gentle, timed, user-first.
// Tracks positive sessions (5+ opens where the user also gave feedback or checked in)
// and prompts only after a meaningful threshold. Never nags.
// Opt-in — dismissable, with a long cooldown after either action.

const POSITIVE_THRESHOLD = 5;   // sessions before first prompt
const COOLDOWN_DAYS = 90;        // days before re-prompting after dismiss/rate

const SESSION_KEY = "nilamind_rating_session_count";
const PROMPTED_KEY = "nilamind_rating_last_prompted_at";

function storageGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* best effort */ }
}

export function recordPositiveSession(): void {
  try {
    const count = Number(storageGet(SESSION_KEY) || "0") + 1;
    storageSet(SESSION_KEY, String(count));
  } catch {
    // no-op
  }
}

function getSessionCount(): number {
  try { return Number(storageGet(SESSION_KEY) || "0"); } catch { return 0; }
}

function getLastPromptedAt(): number | null {
  try {
    const raw = storageGet(PROMPTED_KEY);
    return raw ? Number(raw) : null;
  } catch { return null; }
}

export function shouldPromptRating(): boolean {
  const count = getSessionCount();
  if (count < POSITIVE_THRESHOLD) return false;
  const lastPrompted = getLastPromptedAt();
  if (lastPrompted) {
    const daysSince = (Date.now() - lastPrompted) / (1000 * 60 * 60 * 24);
    if (daysSince < COOLDOWN_DAYS) return false;
  }
  return true;
}

export function dismissRatingPrompt(): void {
  storageSet(PROMPTED_KEY, String(Date.now()));
}

export function onUserRated(): void {
  dismissRatingPrompt();
  // Reset the session counter so they earn the next prompt
  storageSet(SESSION_KEY, "0");
}

export function resetRatingState(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PROMPTED_KEY);
  } catch {
    // best effort
  }
}
