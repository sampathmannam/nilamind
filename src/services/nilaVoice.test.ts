import { describe, it, expect } from "vitest";
import {
  selectTemplate,
  detectScenario,
  buildNilaMessage,
  getAllScenarios,
  getTemplateCount,
  type VoiceScenario,
} from "./nilaVoice";

describe("nilaVoice — template selection", () => {
  it("returns a non-empty string for every scenario", () => {
    for (const scenario of getAllScenarios()) {
      const msg = selectTemplate(scenario, 0);
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("rotates templates deterministically based on seed", () => {
    const a = selectTemplate("greeting", 0);
    const b = selectTemplate("greeting", 1);
    // Different seeds should give different templates (if > 1 template exists)
    if (getTemplateCount("greeting") > 1) {
      expect(a).not.toBe(b);
    }
  });

  it("returns empty string for unknown scenario", () => {
    // @ts-expect-error testing invalid scenario
    expect(selectTemplate("nonexistent", 0)).toBe("");
  });
});

describe("nilaVoice — scenario detection", () => {
  const base = {
    timeOfDay: "afternoon" as const,
    recentMoodAvg: null,
    checkedInToday: false,
    streakDays: 0,
    sleepHours: null,
    isCrisis: false,
    hasRecentEpisode: false,
    isReturning: false,
  };

  it("returns crisis_detected when isCrisis is true", () => {
    expect(detectScenario({ ...base, isCrisis: true })).toBe("crisis_detected");
  });

  it("returns after_episode when hasRecentEpisode is true", () => {
    expect(detectScenario({ ...base, hasRecentEpisode: true })).toBe("after_episode");
  });

  it("returns returning_after_absence when isReturning is true", () => {
    expect(detectScenario({ ...base, isReturning: true })).toBe("returning_after_absence");
  });

  it("returns morning_greeting when morning and not checked in", () => {
    expect(detectScenario({ ...base, timeOfDay: "morning" })).toBe("morning_greeting");
  });

  it("returns evening_greeting when evening and not checked in", () => {
    expect(detectScenario({ ...base, timeOfDay: "evening" })).toBe("evening_greeting");
  });

  it("returns wind_down when night", () => {
    expect(detectScenario({ ...base, timeOfDay: "night" })).toBe("wind_down");
  });

  it("returns sleep_short when sleep < 5 hours", () => {
    expect(detectScenario({ ...base, sleepHours: 4 })).toBe("sleep_short");
  });

  it("returns sleep_good when sleep >= 7 hours", () => {
    expect(detectScenario({ ...base, sleepHours: 8 })).toBe("sleep_good");
  });

  it("returns mood_low when recent average <= 3", () => {
    expect(detectScenario({ ...base, recentMoodAvg: 2, checkedInToday: true })).toBe("mood_low");
  });

  it("returns mood_moderate when recent average 4-5", () => {
    expect(detectScenario({ ...base, recentMoodAvg: 5, checkedInToday: true })).toBe("mood_moderate");
  });

  it("returns mood_good when recent average 6-7", () => {
    expect(detectScenario({ ...base, recentMoodAvg: 6, checkedInToday: true })).toBe("mood_good");
  });

  it("returns mood_high_distress when recent average > 7", () => {
    expect(detectScenario({ ...base, recentMoodAvg: 9, checkedInToday: true })).toBe("mood_high_distress");
  });

  it("returns checkin_prompt when not checked in and no other signal", () => {
    expect(detectScenario({ ...base, checkedInToday: false })).toBe("checkin_prompt");
  });

  it("returns general_support when checked in with no specific signal", () => {
    expect(detectScenario({ ...base, checkedInToday: true })).toBe("general_support");
  });
});

describe("nilaVoice — buildNilaMessage", () => {
  it("returns a message and scenario", () => {
    const result = buildNilaMessage({
      timeOfDay: "morning",
      recentMoodAvg: null,
      checkedInToday: false,
      streakDays: 0,
      sleepHours: null,
      isCrisis: false,
      hasRecentEpisode: false,
      isReturning: false,
    }, 0);
    expect(result.message.length).toBeGreaterThan(0);
    expect(result.scenario).toBe("morning_greeting");
  });

  it("returns crisis scenario with standalone message", () => {
    const result = buildNilaMessage({
      timeOfDay: "afternoon",
      recentMoodAvg: 9,
      checkedInToday: true,
      streakDays: 0,
      sleepHours: null,
      isCrisis: true,
      hasRecentEpisode: false,
      isReturning: false,
    }, 0);
    expect(result.scenario).toBe("crisis_detected");
    expect(result.message).toContain("here");
  });
});
