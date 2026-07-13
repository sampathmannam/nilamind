import { describe, it, expect, beforeEach, vi } from "vitest";
import { secureLocal } from "./secureLocal";
import {
  recordStepStart,
  recordStepComplete,
  recordProtocolAbandon,
  getActiveSession,
  getAdherenceSummary,
  type ProtocolAdherenceSession,
} from "./protocolAdherence";

const ADHERENCE_KEY = "nilamind_protocol_adherence";

function setStored(data: ProtocolAdherenceSession[]) {
  secureLocal.setItem(ADHERENCE_KEY, JSON.stringify(data));
}

function getStored(): ProtocolAdherenceSession[] {
  const raw = secureLocal.getItem(ADHERENCE_KEY);
  return raw ? JSON.parse(raw) : [];
}

describe("protocolAdherence", () => {
  beforeEach(() => {
    secureLocal.removeItem(ADHERENCE_KEY);
  });

  describe("recordStepStart", () => {
    it("creates a new session when none exists", () => {
      const result = recordStepStart("cbti-sleep", "cbti-1", 0);
      expect(result).not.toBeNull();
      expect(result!.protocolId).toBe("cbti-sleep");
      expect(result!.status).toBe("active");
      expect(result!.stepRecords).toHaveLength(1);
      expect(result!.stepRecords[0].stepId).toBe("cbti-1");
      expect(result!.stepRecords[0].stepIndex).toBe(0);
      expect(result!.stepRecords[0].startedAt).toBeTruthy();
      expect(result!.stepRecords[0].completedAt).toBeUndefined();
    });

    it("adds a new step record to an existing active session", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const result = recordStepStart("cbti-sleep", "cbti-2", 1);
      expect(result!.stepRecords).toHaveLength(2);
      expect(result!.stepRecords[1].stepId).toBe("cbti-2");
      expect(result!.stepRecords[1].stepIndex).toBe(1);
    });

    it("does not duplicate a step record if already started", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const result = recordStepStart("cbti-sleep", "cbti-1", 0);
      const matches = result!.stepRecords.filter((s) => s.stepId === "cbti-1");
      expect(matches).toHaveLength(1);
    });

    it("starts a fresh session if the previous one was completed", () => {
      const s1 = recordStepStart("cbti-sleep", "cbti-1", 0);
      recordStepComplete("cbti-sleep", "cbti-1");
      // Manually mark completed — simulate the completion flow
      const stored = getStored();
      stored[0].status = "completed";
      stored[0].endTime = new Date().toISOString();
      secureLocal.setItem(ADHERENCE_KEY, JSON.stringify(stored));

      const s2 = recordStepStart("behavioural-activation", "ba-1", 0);
      expect(s2!.protocolId).toBe("behavioural-activation");
      expect(s2!.status).toBe("active");
      expect(getStored()).toHaveLength(2);
    });

    it("starts a fresh session if the previous one was abandoned", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      recordProtocolAbandon("cbti-sleep");

      const s2 = recordStepStart("behavioural-activation", "ba-1", 0);
      expect(s2!.protocolId).toBe("behavioural-activation");
      expect(s2!.status).toBe("active");
      expect(getStored()).toHaveLength(2);
    });
  });

  describe("recordStepComplete", () => {
    it("marks a started step as completed with a timestamp", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const result = recordStepComplete("cbti-sleep", "cbti-1");
      expect(result).not.toBeNull();
      const completed = result!.stepRecords.find((s) => s.stepId === "cbti-1");
      expect(completed!.completedAt).toBeTruthy();
      expect(completed!.completedAt).toBeTypeOf("string");
    });

    it("returns null if no active session exists", () => {
      const result = recordStepComplete("cbti-sleep", "cbti-1");
      expect(result).toBeNull();
    });

    it("returns null if the step was never started", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const result = recordStepComplete("cbti-sleep", "cbti-999");
      expect(result).toBeNull();
    });

    it("is idempotent — calling twice does not change the timestamp", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const first = recordStepComplete("cbti-sleep", "cbti-1");
      const ts1 = first!.stepRecords[0].completedAt;
      const second = recordStepComplete("cbti-sleep", "cbti-1");
      const ts2 = second!.stepRecords[0].completedAt;
      expect(ts1).toBe(ts2);
    });
  });

  describe("recordProtocolAbandon", () => {
    it("marks the session as abandoned", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const result = recordProtocolAbandon("cbti-sleep");
      expect(result!.status).toBe("abandoned");
      expect(result!.endTime).toBeTruthy();
    });

    it("sets endTime on abandon", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      recordStepStart("cbti-sleep", "cbti-2", 1);
      const result = recordProtocolAbandon("cbti-sleep");
      expect(result!.endTime).toBeTruthy();
      expect(result!.stepRecords).toHaveLength(2);
    });

    it("returns null if no active session exists", () => {
      const result = recordProtocolAbandon("cbti-sleep");
      expect(result).toBeNull();
    });
  });

  describe("getActiveSession", () => {
    it("returns the active session when one exists", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const session = getActiveSession();
      expect(session).not.toBeNull();
      expect(session!.protocolId).toBe("cbti-sleep");
      expect(session!.status).toBe("active");
    });

    it("returns null when no session exists", () => {
      expect(getActiveSession()).toBeNull();
    });

    it("returns null when only completed sessions exist", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      recordProtocolAbandon("cbti-sleep");
      expect(getActiveSession()).toBeNull();
    });
  });

  describe("getAdherenceSummary", () => {
    it("returns zeros when no sessions exist", () => {
      const summary = getAdherenceSummary();
      expect(summary.totalStarted).toBe(0);
      expect(summary.totalCompleted).toBe(0);
      expect(summary.totalAbandoned).toBe(0);
      expect(summary.adherenceRate).toBe(0);
      expect(summary.perProtocol).toEqual([]);
    });

    it("counts completed sessions", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const stored = getStored();
      stored[0].status = "completed";
      stored[0].endTime = new Date().toISOString();
      secureLocal.setItem(ADHERENCE_KEY, JSON.stringify(stored));

      const summary = getAdherenceSummary();
      expect(summary.totalStarted).toBe(1);
      expect(summary.totalCompleted).toBe(1);
      expect(summary.totalAbandoned).toBe(0);
    });

    it("counts abandoned sessions", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      recordProtocolAbandon("cbti-sleep");

      const summary = getAdherenceSummary();
      expect(summary.totalStarted).toBe(1);
      expect(summary.totalAbandoned).toBe(1);
      expect(summary.totalCompleted).toBe(0);
    });

    it("calculates adherence rate correctly", () => {
      // 2 completed, 1 abandoned = 66% rate
      setStored([
        {
          protocolId: "cbti-sleep",
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-02T00:00:00Z",
          status: "completed",
          stepRecords: [],
        },
        {
          protocolId: "behavioural-activation",
          startTime: "2026-01-03T00:00:00Z",
          endTime: "2026-01-04T00:00:00Z",
          status: "completed",
          stepRecords: [],
        },
        {
          protocolId: "worry-postponement",
          startTime: "2026-01-05T00:00:00Z",
          endTime: "2026-01-05T01:00:00Z",
          status: "abandoned",
          stepRecords: [],
        },
      ]);

      const summary = getAdherenceSummary();
      expect(summary.totalStarted).toBe(3);
      expect(summary.totalCompleted).toBe(2);
      expect(summary.totalAbandoned).toBe(1);
      expect(summary.adherenceRate).toBeCloseTo(0.667, 2);
    });

    it("breaks down per protocol", () => {
      setStored([
        {
          protocolId: "cbti-sleep",
          startTime: "2026-01-01T00:00:00Z",
          endTime: "2026-01-02T00:00:00Z",
          status: "completed",
          stepRecords: [
            { stepId: "cbti-1", stepIndex: 0, startedAt: "2026-01-01T00:00:00Z", completedAt: "2026-01-01T00:05:00Z" },
            { stepId: "cbti-2", stepIndex: 1, startedAt: "2026-01-01T01:00:00Z", completedAt: "2026-01-01T01:10:00Z" },
          ],
        },
        {
          protocolId: "cbti-sleep",
          startTime: "2026-01-05T00:00:00Z",
          endTime: "2026-01-05T00:30:00Z",
          status: "abandoned",
          stepRecords: [
            { stepId: "cbti-1", stepIndex: 0, startedAt: "2026-01-05T00:00:00Z" },
          ],
        },
      ]);

      const summary = getAdherenceSummary();
      const cbti = summary.perProtocol.find((p) => p.protocolId === "cbti-sleep");
      expect(cbti).toBeDefined();
      expect(cbti!.started).toBe(2);
      expect(cbti!.completed).toBe(1);
      expect(cbti!.abandoned).toBe(1);
    });

    it("does not count active sessions in totals", () => {
      recordStepStart("cbti-sleep", "cbti-1", 0);
      const summary = getAdherenceSummary();
      expect(summary.totalStarted).toBe(0);
      expect(summary.totalCompleted).toBe(0);
      expect(summary.totalAbandoned).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles corrupted storage gracefully", () => {
      secureLocal.setItem(ADHERENCE_KEY, "{corrupt-json");
      expect(getActiveSession()).toBeNull();
      const summary = getAdherenceSummary();
      expect(summary.totalStarted).toBe(0);
    });

    it("handles null storage gracefully", () => {
      secureLocal.removeItem(ADHERENCE_KEY);
      expect(getActiveSession()).toBeNull();
      expect(() => recordStepStart("cbti-sleep", "cbti-1", 0)).not.toThrow();
    });
  });
});
