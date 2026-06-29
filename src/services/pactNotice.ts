// The notice surface trigger — "notice → your own words → human bridge", the agent wedge in safe form.
//
// When a real shift is noticed (a short-sleep run, or a mood-trajectory deterioration) AND the user has
// written a pact, Nila gently surfaces THEIR OWN letter and offers a user-TAPPED reach-out to the named
// person. Never autonomous, never restrictive, dismissible (and stays dismissed for the day so it can't
// nag). §9 always takes precedence over this (the caller checks crisis first).

import { loadPact, type TrustedPerson } from "./pact";
import { selfReportSleepSignal } from "./sleepInsight";
import { detectInflections } from "./nilaInflection";
import { getInflectionEnabled } from "./inflectionPrefs";
import { loadAssessments } from "./assessments";
import { secureLocal } from "./secureLocal";
import { ymd } from "./streaks";
import type { CheckInEntry } from "../types";

export interface PactNotice { letter: string; person: TrustedPerson; reason: string }

const DISMISS_KEY = "nilamind_pact_notice_dismissed"; // YYYY-MM-DD last dismissed

export function dismissPactNoticeToday(today = ymd(new Date())): void {
  try { secureLocal.setItem(DISMISS_KEY, today); } catch { /* ignore */ }
}
function dismissedToday(today: string): boolean {
  try { return secureLocal.getItem(DISMISS_KEY) === today; } catch { return false; }
}
function readCheckins(): CheckInEntry[] {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? (p as CheckInEntry[]) : [];
  } catch {
    return [];
  }
}

/** Is there an active, undismissed reason to surface the user's pact today? null if no pact / no signal /
 *  already dismissed today. Sleep-run takes priority, then a mood-trajectory deterioration. */
export function activePactNotice(today = ymd(new Date())): PactNotice | null {
  const pact = loadPact();
  if (!pact || dismissedToday(today)) return null;

  const sleep = selfReportSleepSignal();
  if (sleep?.firing) {
    return { letter: pact.letter, person: pact.person, reason: `your sleep's run short the last ${sleep.nightsBelow} nights` };
  }
  if (getInflectionEnabled()) {
    try {
      const sigs = detectInflections(readCheckins(), loadAssessments(), today);
      if (sigs.some((s) => s.direction === "deterioration")) {
        return { letter: pact.letter, person: pact.person, reason: "things have felt heavier than usual lately" };
      }
    } catch { /* defensive */ }
  }
  return null;
}

const DEFAULT_MSG = "Hey — I think I might be heading into a rough patch. Can we talk?";

/** SMS handoff URI the user TAPS to send (never autonomous). Empty when there's no contact number. */
export function reachOutSmsUri(person: TrustedPerson, message = DEFAULT_MSG): string {
  const num = (person.contact || "").replace(/[^\d+]/g, "");
  return num ? `sms:${num}?body=${encodeURIComponent(message)}` : "";
}
