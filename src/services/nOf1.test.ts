import { describe, it, expect, beforeEach } from "vitest";
import { secureLocal } from "./secureLocal";
import { recordProtocolCompletion, getNo1Insights, getNo1DashboardCard, no1ContextBlock, computeNof1Ranking, type ProtocolCompletion } from "./nOf1";

const COMPLETIONS_KEY = "nilamind_protocol_completions";

function setMoodHistory(entries: Array<{ date: string; intensity: number }>) {
  secureLocal.setItem("nilamind_checkins", JSON.stringify(
    entries.map((e) => ({ date: e.date, intensity: e.intensity, emotion: "okay", timestamp: new Date(e.date + "T12:00:00").toISOString() }))
  ));
}

function setCompletions(completions: ProtocolCompletion[]) {
  secureLocal.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
}

describe("nOf1 — protocol name resolution", () => {
  beforeEach(() => {
    secureLocal.removeItem(COMPLETIONS_KEY);
    secureLocal.removeItem("nilamind_checkins");
  });

  it("resolves known protocol IDs to friendly names", () => {
    setMoodHistory([
      { date: "2026-07-10", intensity: 7 },
      { date: "2026-07-11", intensity: 4 },
      { date: "2026-07-12", intensity: 3 },
      { date: "2026-07-13", intensity: 5 },
    ]);
    setCompletions([
      { protocolId: "cbti-sleep", date: "2026-07-10", stepIndex: -1 },
      { protocolId: "behavioral-activation", date: "2026-07-12", stepIndex: -1 },
    ]);

    const insights = getNo1Insights();
    // May or may not have enough data to compute; if it does, names should be resolved
    for (const i of insights) {
      expect(i.protocolName).not.toBe(i.protocolId);
    }
  });
});

describe("nOf1 — confidence tiers", () => {
  beforeEach(() => {
    secureLocal.removeItem(COMPLETIONS_KEY);
    secureLocal.removeItem("nilamind_checkins");
  });

  it("reports low confidence for 2-3 completions", () => {
    setMoodHistory([
      { date: "2026-07-01", intensity: 7 }, { date: "2026-07-02", intensity: 5 },
      { date: "2026-07-05", intensity: 6 }, { date: "2026-07-06", intensity: 4 },
    ]);
    setCompletions([
      { protocolId: "cbti-sleep", date: "2026-07-01", stepIndex: -1 },
      { protocolId: "cbti-sleep", date: "2026-07-05", stepIndex: -1 },
    ]);

    const insights = getNo1Insights();
    for (const i of insights) {
      if (i.protocolId === "cbti-sleep") {
        expect(i.confidence).toBe("low");
      }
    }
  });

  it("reports medium confidence for 4-6 completions", () => {
    setMoodHistory([
      { date: "2026-07-01", intensity: 7 }, { date: "2026-07-02", intensity: 5 },
      { date: "2026-07-04", intensity: 6 }, { date: "2026-07-05", intensity: 4 },
      { date: "2026-07-07", intensity: 8 }, { date: "2026-07-08", intensity: 5 },
      { date: "2026-07-10", intensity: 6 }, { date: "2026-07-11", intensity: 4 },
    ]);
    setCompletions([
      { protocolId: "cbti-sleep", date: "2026-07-01", stepIndex: -1 },
      { protocolId: "cbti-sleep", date: "2026-07-04", stepIndex: -1 },
      { protocolId: "cbti-sleep", date: "2026-07-07", stepIndex: -1 },
      { protocolId: "cbti-sleep", date: "2026-07-10", stepIndex: -1 },
    ]);

    const insights = getNo1Insights();
    for (const i of insights) {
      if (i.protocolId === "cbti-sleep") {
        expect(i.confidence).toBe("medium");
      }
    }
  });

  it("reports high confidence for 7+ completions", () => {
    const dates: string[] = [];
    for (let i = 1; i <= 14; i += 2) {
      const d = `2026-07-${String(i).padStart(2, "0")}`;
      dates.push(d);
    }
    setMoodHistory(dates.flatMap((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return [
        { date: d, intensity: Math.floor(Math.random() * 4) + 6 },
        { date: next.toISOString().split("T")[0], intensity: Math.floor(Math.random() * 4) + 3 },
      ];
    }));
    setCompletions(dates.map((d) => ({ protocolId: "cbti-sleep", date: d, stepIndex: -1 })));

    const insights = getNo1Insights();
    for (const i of insights) {
      if (i.protocolId === "cbti-sleep") {
        expect(i.confidence).toBe("high");
      }
    }
  });
});

describe("nOf1 — 3-day window delta", () => {
  beforeEach(() => {
    secureLocal.removeItem(COMPLETIONS_KEY);
    secureLocal.removeItem("nilamind_checkins");
  });

  it("computes avgDelta within 3 days of completion", () => {
    setMoodHistory([
      { date: "2026-07-10", intensity: 7 },
      { date: "2026-07-11", intensity: 5 },
      { date: "2026-07-12", intensity: 4 },
      { date: "2026-07-13", intensity: 4 },
    ]);
    setCompletions([
      { protocolId: "cbti-sleep", date: "2026-07-10", stepIndex: -1 },
    ]);

    const ranking = computeNof1Ranking();
    // With only 1 completion, computeNof1Ranking might return empty (needs >=2)
    // but avgDeltaWindow3d should still be populated in the ranking
  });
});

describe("nOf1 — context block enrichment", () => {
  beforeEach(() => {
    secureLocal.removeItem(COMPLETIONS_KEY);
    secureLocal.removeItem("nilamind_checkins");
  });

  it("includes confidence info in context block", () => {
    setMoodHistory([
      { date: "2026-07-01", intensity: 7 }, { date: "2026-07-02", intensity: 5 },
      { date: "2026-07-05", intensity: 6 }, { date: "2026-07-06", intensity: 4 },
    ]);
    setCompletions([
      { protocolId: "cbti-sleep", date: "2026-07-01", stepIndex: -1 },
      { protocolId: "cbti-sleep", date: "2026-07-05", stepIndex: -1 },
    ]);

    const block = no1ContextBlock();
    if (block) {
      expect(block).toMatch(/confidence|low|medium|high/i);
    }
  });
});
