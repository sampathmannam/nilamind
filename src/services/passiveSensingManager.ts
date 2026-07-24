// Phase 21.7 — Passive sensing lifecycle orchestrator.
// Coordinates feature extraction, trend analysis, and proactive card generation on app foreground.
// All computation runs synchronously on foreground, <100ms budget.

import { extractTodayFeatures, extractFeatureWindow, type DailyFeatureSet } from "./signalExtractor";
import {
  upsertDailyFeature,
  pruneOldFeatures,
  updatePassiveSensingStatus,
  getPassiveSensingStatus,
} from "./signalStore";
import { computeTrends } from "./trendAggregator";

/** Proactive surface card rendered by PassiveInsightCard in the Dashboard. */
export interface ProactiveSurfaceCard {
  id: string;
  type: string;
  priority: number;
  title: string;
  body: string;
}

export interface SensingResult {
  todayFeatures: DailyFeatureSet;
  trends: ReturnType<typeof computeTrends>;
  cards: ProactiveSurfaceCard[];
}

/**
 * Called on every app foreground event.
 * Coordinates: extract features → store → compute trends → (cards from compound detector).
 * Battery budget: <100ms synchronous. No timers, no background tasks.
 */
export function onAppForeground(): SensingResult {
  // 1. Extract today's features
  const todayFeatures = extractTodayFeatures();

  // 2. Upsert to encrypted store
  upsertDailyFeature(todayFeatures);

  // 3. Prune old features
  pruneOldFeatures();

  // 4. Update status
  const prevStatus = getPassiveSensingStatus();
  updatePassiveSensingStatus({
    lastExtractionDate: todayFeatures.date,
    lastExtractionAt: Date.now(),
    sourcesActive:(todayFeatures.sleep.hoursLastNight != null ? ["sleep"] : [])
      .concat(todayFeatures.activity.screenTimeMinutes != null ? ["activity"] : [])
      .concat(todayFeatures.circadian.firstOpenTime != null ? ["circadian"] : [])
      .concat(todayFeatures.typing.avgTypingSpeed != null ? ["typing"] : []),
    totalExtractions: (prevStatus?.totalExtractions ?? 0) + 1,
  });

  // 5. Compute trends (14-day window)
  const window = extractFeatureWindow(todayFeatures.date, 14);
  const trends = computeTrends(window);

  // 6. Cards are computed by compoundDetector (called externally)
  //    This module provides the data, not the UI decisions
  const cards: ProactiveSurfaceCard[] = [];

  return { todayFeatures, trends, cards };
}

/**
 * Called on every app background event.
 * Only flushes encrypted writes (delegates to secureLocal.flush pattern).
 */
export function onAppBackground(): void {
  // secureLocal's persist chain handles the actual flush
  // This is a no-op placeholder for the lifecycle hook
}

/**
 * Get the sensing status for the settings/privacy screen.
 */
export function getSensingStatus(): {
  lastExtraction: string | null;
  activeSources: string[];
  featureCount: number;
  oldestFeature: string | null;
} {
  const status = getPassiveSensingStatus();
  return {
    lastExtraction: status?.lastExtractionDate ?? null,
    activeSources: status?.sourcesActive ?? [],
    featureCount: status?.totalExtractions ?? 0,
    oldestFeature: null, // computed from store if needed
  };
}
