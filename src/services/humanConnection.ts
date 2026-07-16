/**
 * Human connection tracking — monitors social interaction metrics.
 *
 * Tracks calls, texts, and in-person contacts over a rolling 7-day window.
 * Low connection levels are surfaced in nilaContext so Nila can gently
 * encourage real-world contact. This is a wellness guardrail, not surveillance.
 *
 * Research basis: Social isolation is a major risk factor for depression
 * relapse in bipolar disorder (Sylvies et al., 2019). Social rhythm therapy
 * (IPSRT) emphasizes regular interpersonal contact as a stabilizer.
 */

import { secureLocal, appendToSecureArray } from "./secureLocal";

const STORAGE_KEY = "nilamind_connections";
const WINDOW_DAYS = 7;

export type ConnectionType = "call" | "text" | "in_person" | "video" | "other";

export interface ConnectionRecord {
  type: ConnectionType;
  date: string; // YYYY-MM-DD
}

export type ConnectionLevel = "low" | "adequate" | "strong";

export interface ConnectionAssessment {
  level: ConnectionLevel;
  totalConnections: number;
  byType: Record<string, number>;
  reason: string;
}

/**
 * Record a social connection.
 */
export function trackConnection(type: ConnectionType, date?: string): ConnectionRecord {
  const d = date ?? new Date().toISOString().split("T")[0];
  const rec = { type, date: d };
  appendToSecureArray<ConnectionRecord>(STORAGE_KEY, rec);
  return rec;
}

/**
 * Load all stored connection records.
 */
export function loadConnections(): ConnectionRecord[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Assess connection level over the last 7 days.
 */
export function assessConnection(records: ConnectionRecord[], today?: string): ConnectionAssessment {
  const now = today ? new Date(today + "T12:00:00Z") : new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - WINDOW_DAYS);

  const recent = records.filter((r) => {
    const d = new Date(r.date + "T12:00:00Z");
    return d >= weekAgo && d <= now;
  });

  const byType: Record<string, number> = {};
  for (const r of recent) {
    byType[r.type] = (byType[r.type] || 0) + 1;
  }

  const total = recent.length;
  let level: ConnectionLevel = "low";
  let reason = "";

  if (total >= 5) {
    level = "strong";
    reason = `You've had ${total} connections this week — that's great social engagement.`;
  } else if (total >= 3) {
    level = "adequate";
    reason = `You've connected with ${total} people this week. Keeping up those ties supports wellbeing.`;
  } else {
    level = "low";
    reason = total === 0
      ? "No social connections recorded this week. Even a quick call or text can make a difference."
      : `Only ${total} connection${total === 1 ? "" : "s"} this week. Reaching out to someone you trust can help.`;
  }

  return { level, totalConnections: total, byType, reason };
}

/**
 * Build a context block for nilaContext.
 * Returns "" when connection level is adequate or strong.
 */
export function connectionContextBlock(records?: ConnectionRecord[], today?: string): string {
  const data = records ?? loadConnections();
  const assessment = assessConnection(data, today);
  if (assessment.level !== "low") return "";
  return `[Connection signal: ${assessment.level} — ${assessment.totalConnections} connections this week. ${assessment.reason}]`;
}
