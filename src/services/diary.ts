// diary — canonical owner of the DBT diary-card store (re-architecture Phase 1, 2026-07-18).
//
// Unlike the check-in / journal LOGS (arrays), the DBT diary is a MAP keyed by local date
// (YYYY-MM-DD → the day's card), read by 8 surfaces that each re-implemented the getItem+parse+guard.
// This module is the one place that knows the "nilamind_diary" key and its object-map shape, via the
// shared loadSecureRecord primitive. Writes still go through secureLocal.setItem at the owning screen
// (DiaryCardScreen) — read-side consolidation only, matching secureData's contract.

import { loadSecureRecord } from "./secureData";
import type { DiaryCardEntry } from "../types";

const DIARY_KEY = "nilamind_diary";

/** The DBT diary map keyed by local date. Never throws; {} on missing/corrupt. */
export function loadDiaryMap(): Record<string, DiaryCardEntry> {
  return loadSecureRecord<DiaryCardEntry>(DIARY_KEY);
}

/** The diary cards as a flat array (convenience for the several readers that only want the values). */
export function loadDiaryEntries(): DiaryCardEntry[] {
  return Object.values(loadDiaryMap());
}
