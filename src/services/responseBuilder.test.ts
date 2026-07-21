import { describe, it, expect } from "vitest";
import {
  buildOfflineCompanionReply,
  buildNilaMessage,
  getAllScenarios,
  selectTemplate,
  type VoiceScenario,
} from "./responseBuilder";

// Companion, never therapist — prohibited clinical-claim wording per AGENTS.md golden rules.
const PROHIBITED = [
  /\btherapy\b/i,
  /\btherapist\b/i,
  /\btreat(ing|ment)?\b/i,
  /\bdiagnos(e|is)\b/i,
  /\bcure\b/i,
];

// Sycophantic / colluding phrasing the anti-sycophancy gate must never produce offline.
const COLLUSION = [
  /you'?re (absolutely )?right/i,
  /you are (absolutely )?right/i,
  /you'?re so (powerful|special|chosen|destined)/i,
  /nothing (can|will) stop you/i,
];

describe("responseBuilder — companion warmth & safety", () => {
  it("every voice template is non-empty and free of clinical-claim wording", () => {
    for (const scenario of getAllScenarios()) {
      for (let seed = 0; seed < 8; seed++) {
        const msg = selectTemplate(scenario, seed);
        expect(msg.length).toBeGreaterThan(0);
        for (const re of PROHIBITED) {
          expect(msg).not.toMatch(re);
        }
      }
    }
  });

  it("offline companion reply is warm, non-clinical, and never colludes", () => {
    const ctxs = [
      {},
      { isReturning: true },
      { recentMoodAvg: 2 },
      { recentMoodAvg: 8 },
      { streakDays: 12 },
      { timeOfDay: "evening" as const },
    ];
    for (const ctx of ctxs) {
      for (let seed = 0; seed < 6; seed++) {
        const reply = buildOfflineCompanionReply(ctx, seed);
        expect(reply.length).toBeGreaterThan(0);
        for (const re of PROHIBITED) expect(reply).not.toMatch(re);
        for (const re of COLLUSION) expect(reply).not.toMatch(re);
      }
    }
  });

  it("crisis offline reply points to help and grounding without minimizing", () => {
    const reply = buildOfflineCompanionReply({ isCrisis: true }, 0);
    expect(reply).toMatch(/emergency service|someone you trust/i);
    expect(reply).toMatch(/grounding|breathing/i);
    expect(reply).not.toMatch(/you'?re (just )?overreacting|nothing to worry about/i);
  });

  it("non-crisis offline reply points to tools, not a clinical fix", () => {
    const reply = buildOfflineCompanionReply({}, 0);
    expect(reply).toMatch(/tools are ready|just below/i);
    expect(reply).not.toMatch(/\btreat(ing|ment)?\b|\bdiagnos(e|is)\b|\bcure\b/i);
  });

  it("offline reply never validates grandiosity (anti-sycophancy)", () => {
    // The offline builder has no user text to echo, but the templates must not contain
    // validating/colluding phrasing that a manic user could read as agreement.
    for (let seed = 0; seed < 12; seed++) {
      const reply = buildOfflineCompanionReply({ recentMoodAvg: 9, isReturning: true }, seed);
      for (const re of COLLUSION) expect(reply).not.toMatch(re);
    }
  });

  it("buildNilaMessage stays wired through the builder (backward-compat path)", () => {
    const result = buildNilaMessage(
      {
        timeOfDay: "morning",
        recentMoodAvg: null,
        checkedInToday: false,
        streakDays: 0,
        sleepHours: null,
        isCrisis: false,
        hasRecentEpisode: false,
        isReturning: false,
      },
      0
    );
    expect(result.scenario).toBe("morning_greeting" as VoiceScenario);
    expect(result.message.length).toBeGreaterThan(0);
  });
});
