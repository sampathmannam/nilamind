import { describe, it, expect, beforeEach } from "vitest";
import { onAppForeground, getSensingStatus, onAppBackground } from "./passiveSensingManager";
import { clearPassiveSensingData, getDailyFeature } from "./signalStore";
import { secureLocal } from "./secureLocal";

describe("passiveSensingManager (Phase 21)", () => {
  beforeEach(() => {
    clearPassiveSensingData();
    secureLocal.removeItem("nilamind_mood_history");
    secureLocal.removeItem("nilamind_phone_behaviour");
    secureLocal.removeItem("nilamind_auto_anchors");
    secureLocal.removeItem("nilamind_social_rhythm");
    secureLocal.removeItem("nilamind_typing_patterns");
    secureLocal.removeItem("nilamind_heart_rate");
  });

  describe("onAppForeground", () => {
    it("extracts and stores today's features", () => {
      const result = onAppForeground();
      const today = new Date().toISOString().split("T")[0];
      expect(result.todayFeatures.date).toBe(today);
      // Verify stored
      const stored = getDailyFeature(today);
      expect(stored).not.toBeNull();
      expect(stored!.date).toBe(today);
    });

    it("updates passive sensing status", () => {
      onAppForeground();
      const status = getSensingStatus();
      expect(status.lastExtraction).toBe(new Date().toISOString().split("T")[0]);
      expect(status.featureCount).toBe(1);
    });

    it("increments extraction count", () => {
      onAppForeground();
      onAppForeground();
      const status = getSensingStatus();
      expect(status.featureCount).toBe(2);
    });

    it("computes trends from stored features", () => {
      const result = onAppForeground();
      expect(Array.isArray(result.trends)).toBe(true);
    });

    it("returns empty cards (computed by compoundDetector externally)", () => {
      const result = onAppForeground();
      expect(result.cards).toEqual([]);
    });
  });

  describe("onAppBackground", () => {
    it("does not throw", () => {
      expect(() => onAppBackground()).not.toThrow();
    });
  });

  describe("getSensingStatus", () => {
    it("returns null defaults when no status exists", () => {
      const status = getSensingStatus();
      expect(status.lastExtraction).toBeNull();
      expect(status.activeSources).toEqual([]);
      expect(status.featureCount).toBe(0);
    });

    it("returns status after extraction", () => {
      onAppForeground();
      const status = getSensingStatus();
      expect(status.lastExtraction).not.toBeNull();
      expect(status.featureCount).toBe(1);
    });
  });
});
