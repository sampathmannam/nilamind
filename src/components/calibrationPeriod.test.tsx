// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CalibrationPeriodCard from "./calibrationPeriod";
import { getCalibrationMessage, daysSinceFirstCheckin } from "./calibrationPeriod";

afterEach(cleanup);

describe("CalibrationPeriodCard", () => {
  it("renders the learning message during calibration", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10);
    render(<CalibrationPeriodCard startDate={startDate.toISOString()} />);
    expect(screen.getByText(/learning your patterns/i)).toBeTruthy();
  });

  it("shows progress percentage", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 15);
    render(<CalibrationPeriodCard startDate={startDate.toISOString()} />);
    expect(screen.getByText(/50%/)).toBeTruthy();
  });

  it("renders nothing after calibration period", () => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 31);
    const { container } = render(<CalibrationPeriodCard startDate={startDate.toISOString()} />);
    expect(container.innerHTML).toBe("");
  });
});

describe("getCalibrationMessage", () => {
  it("returns early message for day 0-7", () => {
    const msg = getCalibrationMessage(3);
    expect(msg).toContain("getting to know you");
  });

  it("returns mid message for day 8-20", () => {
    const msg = getCalibrationMessage(14);
    expect(msg).toContain("notice your patterns");
  });

  it("returns late message for day 21-30", () => {
    const msg = getCalibrationMessage(25);
    expect(msg).toContain("clearer picture");
  });
});

describe("daysSinceFirstCheckin", () => {
  it("returns correct day count", () => {
    const start = new Date();
    start.setDate(start.getDate() - 5);
    const days = daysSinceFirstCheckin(start.toISOString());
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });
});
