// Age gate — one-time 18+ self-attestation (2026 compliance audit). Every major AI-mental-health lawsuit
// centers on a minor; 18+ is the defensible default for a solo operator, and a self-attestation is the
// standard for a wellness (non-clinical) app. Non-sensitive flag in plain localStorage (read before the
// encryption gate; no privacy cost). Crisis help stays reachable for anyone who declines — we never leave a
// distressed young person with nothing (see AgeGate.tsx).
import { ls } from "./storageUtils";

const KEY = "nilamind_age_confirmed";

/** True once the user has attested to being 18+. Defaults false — a new user must attest. */
export function isAgeConfirmed(): boolean {
  try { return ls()?.getItem(KEY) === "1"; } catch { return false; }
}

/** Record the 18+ attestation (persists). */
export function confirmAdult(): void {
  try { ls()?.setItem(KEY, "1"); } catch { /* ignore — worst case re-prompts next launch */ }
}
