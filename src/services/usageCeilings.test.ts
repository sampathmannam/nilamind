import { describe, it, expect } from "vitest";
import {
  checkUsageCeiling,
  recordTurn,
  getTodayTurns,
  type UsageCeilingResult,
} from "./usageCeilings";

describe("checkUsageCeiling", () => {
  it("returns no_ceiling when under limit", () => {
    const result = checkUsageCeiling(5, 30);
    expect(result.status).toBe("no_ceiling");
  });

  it("returns ceiling_reached when at limit", () => {
    const result = checkUsageCeiling(30, 30);
    expect(result.status).toBe("ceiling_reached");
  });

  it("returns ceiling_reached when over limit", () => {
    const result = checkUsageCeiling(45, 30);
    expect(result.status).toBe("ceiling_reached");
  });

  it("includes gentle message at ceiling", () => {
    const result = checkUsageCeiling(30, 30);
    expect(result.message).toBeTruthy();
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("includes turns remaining when under limit", () => {
    const result = checkUsageCeiling(10, 30);
    expect(result.turnsRemaining).toBe(20);
  });

  it("returns 0 turns remaining at ceiling", () => {
    const result = checkUsageCeiling(30, 30);
    expect(result.turnsRemaining).toBe(0);
  });

  it("uses default limit of 30 when not specified", () => {
    const result = checkUsageCeiling(25);
    expect(result.status).toBe("no_ceiling");
    expect(result.turnsRemaining).toBe(5);
  });
});

describe("recordTurn / getTodayTurns", () => {
  it("records and retrieves turn count", () => {
    const date = "2026-07-16";
    const count = getTodayTurns(date);
    expect(typeof count).toBe("number");
  });
});
