// Nila's user-owned profile memory — the two durable tiers the blueprint calls "Core Profile" and
// "Active Project State", adapted for a mental-health companion (the third tier, short-term, is just
// the live chat thread). Held to NilaMind's privacy line: every item lives on THIS device (encrypted
// via secureLocal), is captured only with the person's say-so (Nila asks first, then calls a tool —
// see nilaAgent), and is fully viewable/deletable in "What Nila remembers". Nothing is auto-committed
// silently and nothing leaves the phone.

import { secureLocal } from "./secureLocal";

/** Core Profile — stable things about who they are / what they're living with. */
export interface ProfileFact {
  id: string;
  text: string;   // e.g. "in grad school", "values family above work"
  addedAt: string; // YYYY-MM-DD
}

/** Active focus — current, time-bounded things they're working through (days–weeks). */
export interface ActiveFocus {
  id: string;
  text: string;    // e.g. "preparing for an exam", "trying to sleep earlier"
  when?: string;   // rough, natural timeframe, e.g. "in about 2 weeks" (optional)
  addedAt: string;
}

const FACTS_KEY = "nilamind_profile_facts";
const FOCUS_KEY = "nilamind_active_focus";
const FACTS_CAP = 12;
const FOCUS_CAP = 6;

const norm = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, " ");
const today = (): string => new Date().toISOString().split("T")[0];

// Unique id even for items added within the same millisecond (a monotonic counter disambiguates),
// so removeFact/removeFocus never delete a sibling that happened to share a timestamp.
let _seq = 0;
const uid = (prefix: string): string => `${prefix}${Date.now().toString(36)}_${(_seq++).toString(36)}`;

function readArr<T>(key: string): T[] {
  try {
    const raw = secureLocal.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeArr<T>(key: string, arr: T[]): void {
  try {
    secureLocal.setItem(key, JSON.stringify(arr));
  } catch (e) {
    console.error("nilaProfile save failed:", e);
  }
}

// ── Core Profile facts ──────────────────────────────────────────────────────
export const loadFacts = (): ProfileFact[] => readArr<ProfileFact>(FACTS_KEY);

/** Add a stable fact about them (deduped by text; newest kept, capped). Returns the stored item. */
export function addFact(text: string): ProfileFact | null {
  const clean = (text || "").trim();
  if (!clean) return null;
  const all = loadFacts().filter((f) => norm(f.text) !== norm(clean));
  const fact: ProfileFact = { id: uid("pf_"), text: clean, addedAt: today() };
  all.push(fact);
  writeArr(FACTS_KEY, all.slice(-FACTS_CAP));
  return fact;
}

export const removeFact = (id: string): void =>
  writeArr(FACTS_KEY, loadFacts().filter((f) => f.id !== id));

// ── Active focus ────────────────────────────────────────────────────────────
export const loadFoci = (): ActiveFocus[] => readArr<ActiveFocus>(FOCUS_KEY);

/**
 * Add or UPDATE a current focus. Upsert by text so a follow-up that fills in the timeframe (Nila's
 * "roughly when's that?" → their answer) updates the same item rather than duplicating it.
 */
export function addFocus(text: string, when?: string): ActiveFocus | null {
  const clean = (text || "").trim();
  if (!clean) return null;
  const cleanWhen = (when || "").trim() || undefined;
  const all = loadFoci();
  const existing = all.find((f) => norm(f.text) === norm(clean));
  if (existing) {
    if (cleanWhen) existing.when = cleanWhen;
    writeArr(FOCUS_KEY, all);
    return existing;
  }
  const focus: ActiveFocus = { id: uid("af_"), text: clean, when: cleanWhen, addedAt: today() };
  all.push(focus);
  writeArr(FOCUS_KEY, all.slice(-FOCUS_CAP));
  return focus;
}

export const removeFocus = (id: string): void =>
  writeArr(FOCUS_KEY, loadFoci().filter((f) => f.id !== id));

/**
 * The labelled, two-tier briefing for Nila's system prompt, or "" when there's nothing yet.
 * Read-only summary of the user's own on-device items — assembled client-side, never stored server-side.
 */
export function profileContextBlock(): string {
  const facts = loadFacts();
  const foci = loadFoci();
  if (!facts.length && !foci.length) return "";
  const out: string[] = [];
  if (facts.length) {
    out.push("About them (stable things they've told you about who they are / what they're living with):");
    out.push(...facts.map((f) => `- ${f.text}`));
  }
  if (foci.length) {
    out.push("What they're working through right now:");
    out.push(...foci.map((f) => `- ${f.text}${f.when ? ` (${f.when})` : ""}`));
  }
  return out.join("\n");
}
