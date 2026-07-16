import { describe, it, expect } from "vitest";
import {
  trackSession,
  assessDependency,
  type SessionRecord,
  type DependencyLevel,
} from "./dependencyTracker";

describe("trackSession", () => {
  it("returns a SessionRecord with start and end timestamps", () => {
    const now = new Date("2026-07-16T10:00:00Z");
    const rec = trackSession(now, 300_000); // 5 min session
    expect(rec.date).toBe("2026-07-16");
    expect(rec.durationMs).toBe(300_000);
    expect(rec.turnCount).toBeGreaterThan(0);
  });
});

describe("assessDependency", () => {
  function makeSessions(count: number, daysBack: number): SessionRecord[] {
    const sessions: SessionRecord[] = [];
    for (let i = 0; i < count; i++) {
      const d = new Date("2026-07-16T12:00:00Z");
      d.setDate(d.getDate() - daysBack);
      sessions.push({
        date: d.toISOString().split("T")[0],
        durationMs: 600_000, // 10 min each
        turnCount: 15,
      });
    }
    return sessions;
  }

  it("returns 'none' for insufficient data (< 3 sessions)", () => {
    const result = assessDependency(makeSessions(2, 0));
    expect(result.level).toBe("none");
  });

  it("returns 'none' for normal usage (spread across days)", () => {
    const sessions = [
      { date: "2026-07-10", durationMs: 300_000, turnCount: 5 },
      { date: "2026-07-12", durationMs: 300_000, turnCount: 5 },
      { date: "2026-07-14", durationMs: 300_000, turnCount: 5 },
    ];
    const result = assessDependency(sessions);
    expect(result.level).toBe("none");
  });

  it("detects mild dependency for daily sessions (5+ consecutive days)", () => {
    const sessions: SessionRecord[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date("2026-07-16T12:00:00Z");
      d.setDate(d.getDate() - i);
      sessions.push({
        date: d.toISOString().split("T")[0],
        durationMs: 300_000,
        turnCount: 8,
      });
    }
    const result = assessDependency(sessions);
    expect(result.level).toBe("mild");
  });

  it("detects moderate dependency for long daily sessions (7+ consecutive days, 15+ turns)", () => {
    const sessions: SessionRecord[] = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date("2026-07-16T12:00:00Z");
      d.setDate(d.getDate() - i);
      sessions.push({
        date: d.toISOString().split("T")[0],
        durationMs: 900_000, // 15 min
        turnCount: 20,
      });
    }
    const result = assessDependency(sessions);
    expect(result.level).toBe("moderate");
  });

  it("detects severe dependency for very long sessions (10+ days, 20+ turns, 20+ min)", () => {
    const sessions: SessionRecord[] = [];
    for (let i = 0; i < 11; i++) {
      const d = new Date("2026-07-16T12:00:00Z");
      d.setDate(d.getDate() - i);
      sessions.push({
        date: d.toISOString().split("T")[0],
        durationMs: 1_200_000, // 20 min
        turnCount: 25,
      });
    }
    const result = assessDependency(sessions);
    expect(result.level).toBe("severe");
  });

  it("includes a reason string for non-none levels", () => {
    const sessions: SessionRecord[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date("2026-07-16T12:00:00Z");
      d.setDate(d.getDate() - i);
      sessions.push({
        date: d.toISOString().split("T")[0],
        durationMs: 300_000,
        turnCount: 8,
      });
    }
    const result = assessDependency(sessions);
    expect(result.reason).toBeTruthy();
    expect(typeof result.reason).toBe("string");
  });

  it("returns consecutiveDays count", () => {
    const sessions: SessionRecord[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date("2026-07-16T12:00:00Z");
      d.setDate(d.getDate() - i);
      sessions.push({
        date: d.toISOString().split("T")[0],
        durationMs: 300_000,
        turnCount: 8,
      });
    }
    const result = assessDependency(sessions);
    expect(result.consecutiveDays).toBeGreaterThanOrEqual(5);
  });
});
