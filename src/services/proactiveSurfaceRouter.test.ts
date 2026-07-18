import { describe, it, expect, beforeEach } from "vitest";
import {
  selectProactiveCards,
  selectProactiveNudge,
  markCardShown,
  markCardDismissed,
  markCardClicked,
} from "./proactiveSurfaceRouter";
import type { CompoundSignal } from "./compoundDetector";
import type { PhaseShiftSuggestion } from "./episodeSuggester";
import { clearPassiveSensingData } from "./signalStore";

const MOCK_RISK_SIGNAL: CompoundSignal = {
  id: "activity-prodrome",
  kind: "risk",
  source: ["sleep", "activity"],
  label: "Activity pattern shift",
  detail: "Reduced sleep combined with increased phone activity.",
  strength: "moderate",
  basis: "Ortiz et al. 2025",
  confidence: 0.7,
  suggestedAction: "card",
};

const MOCK_PROTECTIVE_SIGNAL: CompoundSignal = {
  id: "resilience-cluster",
  kind: "protective",
  source: ["sleep", "activity", "typing"],
  label: "Steady week",
  detail: "Sleep, activity, and routine have been consistent.",
  strength: "strong",
  basis: "Multiple domains",
  confidence: 0.8,
  suggestedAction: "card",
};

const MOCK_PHASE_SHIFT: PhaseShiftSuggestion = {
  kind: "possible_elevation",
  confidence: 0.7,
  signals: ["short sleep", "screen spike"],
  evidenceDays: 5,
  suggestedCard: {
    title: "A pattern worth noticing",
    body: "A few things have been moving in the same direction.",
    icon: "eye",
    color: "amber",
  },
};

describe("proactiveSurfaceRouter (Phase 22)", () => {
  beforeEach(() => {
    clearPassiveSensingData();
  });

  describe("selectProactiveCards", () => {
    it("returns empty when no signals", () => {
      expect(selectProactiveCards([])).toEqual([]);
    });

    it("returns risk cards from compound signals", () => {
      const cards = selectProactiveCards([MOCK_RISK_SIGNAL]);
      expect(cards.length).toBe(1);
      expect(cards[0].type).toBe("activity_shift");
      expect(cards[0].priority).toBe(2);
    });

    it("returns protective cards", () => {
      const cards = selectProactiveCards([MOCK_PROTECTIVE_SIGNAL]);
      expect(cards.length).toBe(1);
      expect(cards[0].type).toBe("resilience_celebration");
      expect(cards[0].priority).toBe(4);
    });

    it("phase shift has highest priority", () => {
      const cards = selectProactiveCards([MOCK_PROTECTIVE_SIGNAL], MOCK_PHASE_SHIFT);
      expect(cards.length).toBe(2);
      expect(cards[0].type).toBe("phase_shift_gentle");
      expect(cards[0].priority).toBe(1);
    });

    it("caps at 3 cards per day", () => {
      const signals = [
        MOCK_RISK_SIGNAL,
        { ...MOCK_RISK_SIGNAL, id: "circadian-disintegration" },
        { ...MOCK_RISK_SIGNAL, id: "withdrawal-cascade" },
        { ...MOCK_RISK_SIGNAL, id: "typing-motor-concordance" },
      ];
      const cards = selectProactiveCards(signals);
      expect(cards.length).toBeLessThanOrEqual(3);
    });

    it("enforces cooldown for same card type", () => {
      // Show a card
      const cards = selectProactiveCards([MOCK_RISK_SIGNAL]);
      if (cards.length > 0) {
        markCardShown(cards[0]);
        // Try to show again — should be blocked by cooldown
        const cards2 = selectProactiveCards([MOCK_RISK_SIGNAL]);
        expect(cards2.length).toBe(0);
      }
    });
  });

  describe("selectProactiveNudge", () => {
    it("returns null when no risk signals", () => {
      expect(selectProactiveNudge([])).toBeNull();
      expect(selectProactiveNudge([MOCK_PROTECTIVE_SIGNAL])).toBeNull();
    });

    it("returns nudge for risk signals", () => {
      const nudge = selectProactiveNudge([MOCK_RISK_SIGNAL]);
      expect(nudge).not.toBeNull();
      expect(nudge!.text).toContain("Activity pattern shift");
      expect(nudge!.route).toBe("dashboard");
    });
  });

  describe("card lifecycle", () => {
    it("records card shown event", () => {
      const cards = selectProactiveCards([MOCK_RISK_SIGNAL]);
      if (cards.length > 0) {
        markCardShown(cards[0]);
        // Card should now be in cooldown
        const cards2 = selectProactiveCards([MOCK_RISK_SIGNAL]);
        expect(cards2.length).toBe(0);
      }
    });

    it("records card dismissed event", () => {
      const cards = selectProactiveCards([MOCK_RISK_SIGNAL]);
      if (cards.length > 0) {
        expect(() => markCardDismissed(cards[0])).not.toThrow();
      }
    });

    it("records card clicked event", () => {
      const cards = selectProactiveCards([MOCK_RISK_SIGNAL]);
      if (cards.length > 0) {
        expect(() => markCardClicked(cards[0])).not.toThrow();
      }
    });
  });
});
