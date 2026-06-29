// On-device consented-contribution layer — the ONLY path by which an example a person CHOOSES can
// later leave the device to help train Nila's model (the upload step itself does NOT exist yet; this
// only captures consent locally).
//
// The privacy contract: a donation is the reply Nila gave PLUS the better wording the person typed —
// NEVER the conversation, the check-ins, the mood, or anything else. Before a donation is queued it is
//   (1) crisis-EXCLUDED  — a donation whose reply or suggestion carries crisis content is refused (§9),
//   (2) PII-SCRUBBED      — deterministic patterns strip emails / phone+long-digit runs / urls / @handles,
//   (3) PREVIEWED verbatim — the UI shows the exact scrubbed payload (buildDonationPreview) before confirm,
//   (4) REVOCABLE         — until an upload step exists, a donation can always be withdrawn.
// Encrypted at rest (nilamind_donations ∈ SENSITIVE_KEYS). The counts-only analytics channel lives
// separately in nilaFeedback (feedbackSummary); this is the explicit-example channel.

import { secureLocal } from "./secureLocal";
import { scanForCrisis } from "../safety";
import type { ReplyFeedback } from "./nilaFeedback";

const KEY = "nilamind_donations";
const CAP = 100;
const MAXLEN = 2000;

export interface Donation {
  id: string;          // mirrors the source feedback id — one donation per feedback entry
  at: string;          // YYYY-MM-DD donated
  nilaReply: string;   // scrubbed reply being corrected
  betterReply: string; // scrubbed better wording the person typed
}

export interface DonationPreview {
  nilaReply: string;
  betterReply: string;
  blockedByCrisis: boolean; // true => cannot donate (crisis content in the reply or the suggestion)
}

const today = (): string => new Date().toISOString().split("T")[0];

/** Deterministic PII scrub — emails, phone/long-digit runs, URLs, @handles. Best-effort by design; the
 *  VERBATIM preview is the real safeguard (the person sees exactly what would be sent before confirming).
 *  Never throws; always bounded to MAXLEN. */
export function scrubPII(text: string): string {
  return (text || "")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email]")
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/\b\d[\d ()+\-]{6,}\d\b/g, "[number]") // phone / account / long digit runs
    .replace(/(^|\s)@\w{2,}\b/g, "$1[handle]")
    .slice(0, MAXLEN);
}

export function loadDonations(): Donation[] {
  try {
    const raw = secureLocal.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(list: Donation[]): void {
  try {
    secureLocal.setItem(KEY, JSON.stringify(list.slice(-CAP)));
  } catch (e) {
    console.error("nilaContributions save failed:", e);
  }
}

/** Build the EXACT payload a donation would queue — scrubbed reply + suggestion, with a crisis flag.
 *  The UI renders this verbatim; confirmDonation re-derives it (it never trusts a passed-in payload). */
export function buildDonationPreview(entry: ReplyFeedback): DonationPreview {
  const reply = entry?.reply || "";
  const suggestion = entry?.suggestion || "";
  // §9: a donation may never carry crisis content. Scan the RAW text (pre-scrub) so scrubbing can never
  // hide a crisis phrase — same scan-before-egress discipline coachAssist uses.
  const blockedByCrisis = scanForCrisis(reply) || scanForCrisis(suggestion);
  return { nilaReply: scrubPII(reply), betterReply: scrubPII(suggestion), blockedByCrisis };
}

/** Queue a consented donation for a feedback entry. Returns false (and queues NOTHING) when the entry
 *  has no typed suggestion or carries crisis content. Idempotent per id. */
export function confirmDonation(entry: ReplyFeedback): boolean {
  if (!entry || !entry.suggestion || !entry.suggestion.trim()) return false;
  const preview = buildDonationPreview(entry);
  if (preview.blockedByCrisis) return false; // §9: crisis content is never donated
  const all = loadDonations();
  if (all.some((d) => d.id === entry.id)) return true; // already donated (idempotent)
  all.push({ id: entry.id, at: today(), nilaReply: preview.nilaReply, betterReply: preview.betterReply });
  save(all);
  return true;
}

export function isDonated(id: string): boolean {
  return loadDonations().some((d) => d.id === id);
}

/** Withdraw a donation — revocable until an upload step exists. */
export function revokeDonation(id: string): void {
  save(loadDonations().filter((d) => d.id !== id));
}

export function donationCount(): number {
  return loadDonations().length;
}

/** The consented queue a future upload step would send. Until then it never leaves the device. */
export function donatedContributions(): Donation[] {
  return loadDonations();
}

export function clearDonations(): void {
  try {
    secureLocal.removeItem(KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
