// "Letter to my unwell self" — the witness-gated, no-teeth pact (the agent's safe core).
//
// The user, WHEN WELL, writes a message to their future unwell self and names a trusted person. It lives
// on-device only. Nila may SURFACE it back to the user (and offer a user-TAPPED handoff to the named
// person) when a real shift is noticed — it NEVER acts autonomously, never restricts, is always
// overridable. Red-panel ethics bright lines baked in: authored when well, the user's own words, no
// autonomous teeth, re-ratifiable so it can't go stale, view/edit/delete anytime.

import { secureLocal } from "./secureLocal";

export interface TrustedPerson { name: string; contact?: string }
export interface Pact {
  letter: string;
  person: TrustedPerson;
  writtenAt: string;  // ISO — when first written
  ratifiedAt: string; // ISO — last time the well-self confirmed "this still holds"
}

const KEY = "nilamind_pact";
const STALE_DAYS = 90;

export function loadPact(): Pact | null {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Pact;
    return p && typeof p.letter === "string" && p.person && typeof p.person.name === "string" && p.letter.trim() && p.person.name.trim()
      ? p
      : null;
  } catch {
    return null;
  }
}

export function hasPact(): boolean { return !!loadPact(); }

/** Save/replace the pact. Preserves the original writtenAt; stamps ratifiedAt = now (writing IS ratifying). */
export function savePact(letter: string, person: TrustedPerson, nowISO = new Date().toISOString()): Pact {
  const existing = loadPact();
  const pact: Pact = {
    letter: letter.trim(),
    person: { name: person.name.trim(), contact: person.contact?.trim() || undefined },
    writtenAt: existing?.writtenAt ?? nowISO,
    ratifiedAt: nowISO,
  };
  try { secureLocal.setItem(KEY, JSON.stringify(pact)); } catch { /* ignore */ }
  return pact;
}

/** Well-self confirms the existing pact still holds (refreshes ratifiedAt, clears staleness). */
export function ratifyPact(nowISO = new Date().toISOString()): Pact | null {
  const p = loadPact();
  if (!p) return null;
  const next: Pact = { ...p, ratifiedAt: nowISO };
  try { secureLocal.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

export function clearPact(): void { try { secureLocal.setItem(KEY, ""); } catch { /* ignore */ } }

/** PURE. Has it been too long since the well-self last confirmed the pact? → prompt a gentle re-ratify. */
export function isPactStale(p: Pact | null, nowISO = new Date().toISOString(), staleDays = STALE_DAYS): boolean {
  if (!p?.ratifiedAt) return false;
  const days = (Date.parse(nowISO) - Date.parse(p.ratifiedAt)) / 86_400_000;
  return Number.isFinite(days) && days > staleDays;
}
