/**
 * Dependency tracker — detects potential over-reliance on the app.
 *
 * Tracks session frequency and duration to flag when usage patterns suggest
 * unhealthy dependency rather than genuine wellness support. This is a
 * wellness guardrail, not a usage limiter — it surfaces a gentle signal
 * to Nila's context so she can encourage real-world connection.
 *
 * Research basis: SmartBipolar (2026) found passive smartphone monitoring
 * alone has zero effect; engagement must be structured and time-limited.
 * Over-reliance on chatbot companions can substitute for human connection
 * (Lucas et al., 2014).
 */

import { secureLocal, appendToSecureArray } from "./secureLocal";

const STORAGE_KEY = "nilamind_session_log";
const MAX_SESSIONS = 60; // ~2 months of daily data

export interface SessionRecord {
  date: string; // YYYY-MM-DD
  durationMs: number;
  turnCount: number;
}

export type DependencyLevel = "none" | "mild" | "moderate" | "severe";

export interface DependencyAssessment {
  level: DependencyLevel;
  consecutiveDays: number;
  avgTurnsPerDay: number;
  avgDurationMin: number;
  reason: string;
}

/**
 * Create a session record. Pure — no side effects.
 */
export function trackSession(now: Date, durationMs: number, turnCount = 1): SessionRecord {
  return {
    date: now.toISOString().split("T")[0],
    durationMs,
    turnCount,
  };
}

/**
 * Record a session to encrypted storage.
 */
export function recordSession(session: SessionRecord): void {
  appendToSecureArray<SessionRecord>(STORAGE_KEY, session);
  // Prune to MAX_SESSIONS
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (raw) {
      const arr: SessionRecord[] = JSON.parse(raw);
      if (arr.length > MAX_SESSIONS) {
        secureLocal.setItem(STORAGE_KEY, JSON.stringify(arr.slice(-MAX_SESSIONS)));
      }
    }
  } catch { /* best-effort */ }
}

/**
 * Load all stored session records.
 */
export function loadSessions(): SessionRecord[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    }
  } catch { /* */ }
  return [];
}

/**
 * Count the longest streak of consecutive days with sessions.
 */
function countConsecutiveDays(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;
  const uniqueDates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]);
    const curr = new Date(uniqueDates[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

/**
 * Assess dependency level based on session history.
 */
export function assessDependency(sessions: SessionRecord[]): DependencyAssessment {
  if (sessions.length < 3) {
    return { level: "none", consecutiveDays: 0, avgTurnsPerDay: 0, avgDurationMin: 0, reason: "" };
  }

  const consecutiveDays = countConsecutiveDays(sessions);
  const uniqueDates = [...new Set(sessions.map((s) => s.date))];
  const totalTurns = sessions.reduce((sum, s) => sum + s.turnCount, 0);
  const totalDuration = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const avgTurnsPerDay = Math.round(totalTurns / uniqueDates.length);
  const avgDurationMin = Math.round(totalDuration / uniqueDates.length / 60_000);

  let level: DependencyLevel = "none";
  let reason = "";

  if (consecutiveDays >= 10 && avgTurnsPerDay >= 20 && avgDurationMin >= 20) {
    level = "severe";
    reason = `You've used Nila for ${consecutiveDays} consecutive days with long sessions. Real-world connections are important too — consider reaching out to someone you trust.`;
  } else if (consecutiveDays >= 7 && avgTurnsPerDay >= 15 && avgDurationMin >= 15) {
    level = "moderate";
    reason = `You've been checking in daily for ${consecutiveDays} days with extended sessions. Nila is here to support you, but in-person connection matters too.`;
  } else if (consecutiveDays >= 5) {
    level = "mild";
    reason = `You've used Nila ${consecutiveDays} days in a row. That's great engagement — just remember to balance with real-world activities.`;
  }

  return { level, consecutiveDays, avgTurnsPerDay, avgDurationMin, reason };
}

/**
 * Build a one-line context block for nilaContext.
 * Returns "" when there's nothing meaningful to say.
 */
export function dependencyContextBlock(sessions?: SessionRecord[]): string {
  const data = sessions ?? loadSessions();
  const assessment = assessDependency(data);
  if (assessment.level === "none") return "";
  return `[Dependency signal: ${assessment.level} — ${assessment.consecutiveDays} consecutive days, avg ${assessment.avgTurnsPerDay} turns/day, avg ${assessment.avgDurationMin} min/session. ${assessment.reason}]`;
}
