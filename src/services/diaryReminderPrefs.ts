// Diary reminder preference — a single, user-chosen, OPT-IN daily reminder time to journal.
//
// Deliberately NOT a streak: per the deep-research synthesis (2026-07-16), streak/loss-aversion
// mechanics and variable-reward "hook model" claims did not survive adversarial verification, and
// conflict with NilaMind's own documented anti-punitive-streak stance (see Ashlar "tending stone,
// never zero-reset"). This is just an implementation-intention style "when will you journal today"
// reminder the user sets themselves — off by default (opt-in, never nags), no penalty for skipping,
// no counter. Non-sensitive UI pref → plain localStorage, same pattern as reminders.ts/emaPrefs.ts.

import { ls } from "./storageUtils";

const KEY = "nilamind_diary_reminder";

export interface DiaryReminderPrefs {
  enabled: boolean;
  time: string; // "HH:MM", 24h
}

const DEFAULTS: DiaryReminderPrefs = { enabled: false, time: "20:00" };

export function getDiaryReminderPrefs(): DiaryReminderPrefs {
  try {
    const raw = ls()?.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setDiaryReminderPrefs(p: Partial<DiaryReminderPrefs>): void {
  const next = { ...getDiaryReminderPrefs(), ...p };
  try { ls()?.setItem(KEY, JSON.stringify(next)); } catch { /* best-effort */ }
}
