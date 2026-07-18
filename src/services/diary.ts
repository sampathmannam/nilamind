// diary — canonical owner of the DBT diary-card store (re-architecture Phase 1, 2026-07-18).
//
// Unlike the check-in / journal LOGS (arrays), the DBT diary is a MAP keyed by local date
// (YYYY-MM-DD → the day's card), read by 8 surfaces that each re-implemented the getItem+parse+guard.
// The key lives in secureData.SECURE_KEYS (single source for reader + writer). Reads go through the shared
// loadSecureRecord primitive; the write path (DiaryCardScreen) goes through updateSecureRecord on the same
// key — both directions bound to one const, so the key can never drift between them.

import { loadSecureRecord, SECURE_KEYS } from "./secureData";
import type { DiaryCardEntry } from "../types";

const DIARY_KEY = SECURE_KEYS.diary;

/** The DBT diary map keyed by local date. Never throws; {} on missing/corrupt. */
export function loadDiaryMap(): Record<string, DiaryCardEntry> {
  return loadSecureRecord<DiaryCardEntry>(DIARY_KEY);
}

/** The diary cards as a flat array (convenience for the several readers that only want the values). */
export function loadDiaryEntries(): DiaryCardEntry[] {
  return Object.values(loadDiaryMap());
}
