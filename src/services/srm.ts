// Social Rhythm Metric (SRM) — IPSRT-inspired rhythm stability computation.
// Score 0-100 based on consistency of wake/bed times derived from check-in data.
// Higher = more stable. null when insufficient data.
// Privacy-first: all computation is on-device from nilamind_checkins.

import { secureLocal } from "./secureLocal";
import type { CheckInEntry } from "../types";

interface AnchorSnapshot {
  date: string;
  wakeHour?: number;
  bedHour?: number;
}

/** Load recent check-ins and extract approximate anchor times. */
function loadAnchors(days: number): AnchorSnapshot[] {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return [];
    const checkins: CheckInEntry[] = JSON.parse(raw);
    if (!Array.isArray(checkins)) return [];

    const cutoff = Date.now() - days * 86400000;
    const byDate = new Map<string, AnchorSnapshot>();

    for (const c of checkins) {
      const t = new Date(c.timestamp ?? c.date).getTime();
      if (isNaN(t) || t < cutoff) continue;
      const date = c.date;
      if (!byDate.has(date)) byDate.set(date, { date });
      const snap = byDate.get(date)!;
      // Use timestamp hour as a rough wake-time anchor
      const hour = new Date(c.timestamp ?? c.date).getHours();
      if (snap.wakeHour === undefined) {
        snap.wakeHour = hour;
      } else {
        snap.bedHour = hour;
      }
    }
    return Array.from(byDate.values());
  } catch {
    return [];
  }
}

/** Compute rhythm stability score (0-100) over recent N days. null if <3 data points. */
export function computeRhythmStabilityScore(days: number = 14): number | null {
  const anchors = loadAnchors(days);
  if (anchors.length < 3) return null;

  const wakeHours = anchors.map((a) => a.wakeHour).filter((h): h is number => h !== undefined);
  const bedHours = anchors.map((a) => a.bedHour).filter((h): h is number => h !== undefined);

  if (wakeHours.length < 2 && bedHours.length < 2) return null;

  const wakeStd = stdDev(wakeHours);
  const bedStd = stdDev(bedHours);
  const avgStd = (wakeStd + bedStd) / 2;

  // 0h std dev = 100, 6h+ std dev = 0
  const score = Math.max(0, Math.min(100, Math.round(100 - avgStd * 16.7)));
  return score;
}

/** Get names of anchors that are disrupted (variance above threshold). */
export function getDisruptedAnchors(thresholdMinutes: number = 60, days: number = 14): string[] {
  const anchors = loadAnchors(days);
  const disrupted: string[] = [];

  const wakeHours = anchors.map((a) => a.wakeHour).filter((h): h is number => h !== undefined);
  const bedHours = anchors.map((a) => a.bedHour).filter((h): h is number => h !== undefined);

  if (wakeHours.length >= 3 && stdDev(wakeHours) * 60 > thresholdMinutes) {
    disrupted.push("wake");
  }
  if (bedHours.length >= 3 && stdDev(bedHours) * 60 > thresholdMinutes) {
    disrupted.push("bed");
  }
  return disrupted;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
