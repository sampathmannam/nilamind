// Phase 21.3 — Encrypted feature persistence for passive sensing.
// Stores DailyFeatureSet objects in a rolling 90-day window via secureLocal.
// Also stores proactive card event history for anti-fatigue.

import { secureLocal } from "./secureLocal";
import type { DailyFeatureSet } from "./signalExtractor";

export const SIGNAL_FEATURES_KEY = "nilamind_signal_features";
export const PROACTIVE_CARDS_KEY = "nilamind_proactive_cards";
export const PASSIVE_SENSING_STATUS_KEY = "nilamind_passive_sensing_status";

export const MAX_FEATURE_DAYS = 90;
export const MAX_CARD_RECORDS = 50;

export interface ProactiveCardRecord {
  id: string;
  type: string;
  shownAt: string;
  dismissed: boolean;
  dismissedAt?: string;
  clicked: boolean;
}

export interface PassiveSensingStatus {
  lastExtractionDate: string;
  lastExtractionAt: number;
  sourcesActive: string[];
  totalExtractions: number;
}

function readFeatures(): DailyFeatureSet[] {
  try {
    const raw = secureLocal.getItem(SIGNAL_FEATURES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFeatures(features: DailyFeatureSet[]): void {
  secureLocal.setItem(SIGNAL_FEATURES_KEY, JSON.stringify(features));
}

function readCardRecords(): ProactiveCardRecord[] {
  try {
    const raw = secureLocal.getItem(PROACTIVE_CARDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCardRecords(records: ProactiveCardRecord[]): void {
  secureLocal.setItem(PROACTIVE_CARDS_KEY, JSON.stringify(records));
}

/** Upsert features for a specific date. Overwrites if date exists. Maintains 90-day cap. */
export function upsertDailyFeature(features: DailyFeatureSet): void {
  const all = readFeatures();
  const idx = all.findIndex((f) => f.date === features.date);
  if (idx >= 0) {
    all[idx] = features;
  } else {
    all.push(features);
  }
  // Sort oldest first, then cap
  all.sort((a, b) => a.date.localeCompare(b.date));
  while (all.length > MAX_FEATURE_DAYS) all.shift();
  writeFeatures(all);
}

/** Get features for a specific date. */
export function getDailyFeature(date: string): DailyFeatureSet | null {
  return readFeatures().find((f) => f.date === date) ?? null;
}

/** Get the last N days of features (oldest-first). */
export function getFeatureWindow(days: number): DailyFeatureSet[] {
  const all = readFeatures();
  return all.slice(-days);
}

/** Record a proactive card event. */
export function recordProactiveCardEvent(event: ProactiveCardRecord): void {
  const records = readCardRecords();
  records.push(event);
  while (records.length > MAX_CARD_RECORDS) records.shift();
  writeCardRecords(records);
}

/** Check anti-fatigue: has this card type been shown in the last N hours? */
export function isCardTypeInCooldown(cardType: string, cooldownHours: number): boolean {
  const records = readCardRecords();
  const cutoff = Date.now() - cooldownHours * 3600 * 1000;
  return records.some(
    (r) => r.type === cardType && new Date(r.shownAt).getTime() > cutoff
  );
}

/** Prune features older than 90 days. */
export function pruneOldFeatures(): void {
  const all = readFeatures();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_FEATURE_DAYS);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const pruned = all.filter((f) => f.date >= cutoffStr);
  if (pruned.length < all.length) writeFeatures(pruned);
}

/** Get the current passive sensing status. */
export function getPassiveSensingStatus(): PassiveSensingStatus | null {
  try {
    const raw = secureLocal.getItem(PASSIVE_SENSING_STATUS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Update passive sensing status. */
export function updatePassiveSensingStatus(status: PassiveSensingStatus): void {
  secureLocal.setItem(PASSIVE_SENSING_STATUS_KEY, JSON.stringify(status));
}

/** Clear all passive sensing data. */
export function clearPassiveSensingData(): void {
  secureLocal.removeItem(SIGNAL_FEATURES_KEY);
  secureLocal.removeItem(PROACTIVE_CARDS_KEY);
  secureLocal.removeItem(PASSIVE_SENSING_STATUS_KEY);
}
