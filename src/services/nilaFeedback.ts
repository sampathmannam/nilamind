// On-device feedback + improvement-signal layer — the privacy-preserving "gather data from the model"
// piece of the improvement flywheel. EVERYTHING here stays on THIS device: per-reply ratings and the
// optional better-reply a person chooses to suggest. Nothing uploads from here — a future federated /
// aggregation step is the only thing that would ever leave, and only as COUNTS or explicitly-donated
// examples, never the raw conversation. Encrypted at rest; the person can see the totals and clear it.

import { secureLocal } from "./secureLocal";

export type Rating = "up" | "down";

export interface ReplyFeedback {
  id: string;
  at: string;          // YYYY-MM-DD
  rating: Rating;
  reply: string;       // the Nila reply being rated (kept local; capped)
  suggestion?: string; // "what would've helped" — an explicit contribution the person typed
}

const KEY = "nilamind_feedback";
const CAP = 100;
const MAXLEN = 2000;

let _seq = 0;
const uid = (): string => `fb_${Date.now().toString(36)}_${(_seq++).toString(36)}`;
const today = (): string => new Date().toISOString().split("T")[0];

export function loadFeedback(): ReplyFeedback[] {
  try {
    const raw = secureLocal.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(list: ReplyFeedback[]): void {
  try {
    secureLocal.setItem(KEY, JSON.stringify(list.slice(-CAP)));
  } catch (e) {
    console.error("nilaFeedback save failed:", e);
  }
}

/** Record a 👍/👎 on a reply, plus an optional suggested better reply. Returns the stored entry. */
export function recordFeedback(reply: string, rating: Rating, suggestion?: string): ReplyFeedback {
  const entry: ReplyFeedback = { id: uid(), at: today(), rating, reply: (reply || "").slice(0, MAXLEN) };
  const s = (suggestion || "").trim();
  if (s) entry.suggestion = s.slice(0, MAXLEN);
  const all = loadFeedback();
  all.push(entry);
  save(all);
  return entry;
}

/** Attach a typed "what would've helped" to an existing entry (so a 👎 stays one tap, suggestion optional). */
export function attachSuggestion(id: string, suggestion: string): void {
  const s = (suggestion || "").trim();
  if (!s) return;
  const all = loadFeedback();
  const f = all.find((x) => x.id === id);
  if (!f) return;
  f.suggestion = s.slice(0, MAXLEN);
  save(all);
}

export interface FeedbackSummary { total: number; up: number; down: number; suggestions: number; }

/** Aggregate counts only — the shape a future federated step would send (never the reply text). */
export function feedbackSummary(): FeedbackSummary {
  const all = loadFeedback();
  return {
    total: all.length,
    up: all.filter((f) => f.rating === "up").length,
    down: all.filter((f) => f.rating === "down").length,
    suggestions: all.filter((f) => !!f.suggestion).length,
  };
}

/** The better-reply suggestions a person typed — the opt-in contributions queued for a future round. */
export function pendingContributions(): ReplyFeedback[] {
  return loadFeedback().filter((f) => !!f.suggestion);
}

/** Wipe all feedback (user control — surfaced in "What Nila remembers"). */
export function clearFeedback(): void {
  try {
    secureLocal.removeItem(KEY);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}
