import { describe, it, expect } from "vitest";
import {
  getPopulationPrior,
  isInCalibrationPeriod,
  getContextBlock,
  type PopulationPrior,
} from "./populationPriors";

describe("getPopulationPrior", () => {
  it("returns a prior for age 25-34", () => {
    const prior = getPopulationPrior(28);
    expect(prior).toBeTruthy();
    expect(prior.ageRange).toBe("25-34");
    expect(prior.typicalMood).toBeGreaterThan(0);
    expect(prior.typicalMood).toBeLessThanOrEqual(10);
  });

  it("returns a prior for age 35-44", () => {
    const prior = getPopulationPrior(40);
    expect(prior.ageRange).toBe("35-44");
  });

  it("returns default prior for unknown age", () => {
    const prior = getPopulationPrior(5);
    expect(prior.ageRange).toBe("default");
  });

  it("returns percentile rank for a given score", () => {
    const prior = getPopulationPrior(28);
    const rank = prior.getPercentile(5);
    expect(rank).toBeGreaterThanOrEqual(0);
    expect(rank).toBeLessThanOrEqual(100);
  });
});

describe("isInCalibrationPeriod", () => {
  it("returns true for first 30 days", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);
    expect(isInCalibrationPeriod(startDate.toISOString())).toBe(true);
  });

  it("returns false after 30 days", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31);
    expect(isInCalibrationPeriod(startDate.toISOString())).toBe(false);
  });
});

describe("getContextBlock", () => {
  it("returns a context block during calibration", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10);
    const block = getContextBlock(startDate.toISOString(), 28);
    expect(block).toContain("Calibration period");
    expect(block).toContain("population reference");
  });

  it("returns empty after calibration", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31);
    const block = getContextBlock(startDate.toISOString(), 28);
    expect(block).toBe("");
  });
});
