import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  recordMetric,
  getMetrics,
  clearMetrics,
  onMetric,
  type PerformanceMetric,
} from "./performance";

beforeEach(() => {
  clearMetrics();
});

describe("performance", () => {
  it("recordMetric adds a metric", () => {
    recordMetric("test-metric", 42);
    const m = getMetrics();
    expect(m).toHaveLength(1);
    expect(m[0].name).toBe("test-metric");
    expect(m[0].value).toBe(42);
    expect(typeof m[0].timestamp).toBe("number");
  });

  it("recordMetric includes metadata when provided", () => {
    recordMetric("llm_latency", 1200, { model: "gemma-1b" });
    const m = getMetrics();
    expect(m[0].metadata).toEqual({ model: "gemma-1b" });
  });

  it("getMetrics returns a copy (not the internal array)", () => {
    recordMetric("x", 1);
    const m1 = getMetrics();
    const m2 = getMetrics();
    expect(m1).not.toBe(m2);
    expect(m1).toEqual(m2);
  });

  it("clearMetrics empties all metrics", () => {
    recordMetric("a", 1);
    recordMetric("b", 2);
    expect(getMetrics()).toHaveLength(2);
    clearMetrics();
    expect(getMetrics()).toHaveLength(0);
  });

  it("onMetric callback fires on each recordMetric call", () => {
    const cb = vi.fn();
    onMetric(cb);
    recordMetric("x", 10);
    recordMetric("y", 20);
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ name: "x", value: 10 }),
    );
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ name: "y", value: 20 }),
    );
  });

  it("onMetric returns unsubscribe function", () => {
    const cb = vi.fn();
    const unsub = onMetric(cb);
    recordMetric("a", 1);
    unsub();
    recordMetric("b", 2);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("caps metrics at 200 (oldest dropped)", () => {
    for (let i = 0; i < 205; i++) {
      recordMetric(`metric_${i}`, i);
    }
    const m = getMetrics();
    expect(m).toHaveLength(200);
    expect(m[0].name).toBe("metric_5");
    expect(m[m.length - 1].name).toBe("metric_204");
  });
});
