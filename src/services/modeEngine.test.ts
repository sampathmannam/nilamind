import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the two storage-backed reads getUserState depends on, so we can assert the elevation-folding
// wiring deterministically (mirrors the vi.mock pattern in CrisisOverlay.test.tsx).
vi.mock("./secureLocal", () => ({
  secureLocal: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  onPersistError: () => () => {},
}));
vi.mock("./ema", () => ({ emaElevationSignal: vi.fn(() => "none") }));
vi.mock("./chatElevation", () => ({
  chatElevationSignal: vi.fn(() => "none"),
  noteChatElevation: vi.fn(),
  clearChatElevation: vi.fn(),
}));
vi.mock("./chatAffect", () => ({
  todayAffectBucket: vi.fn(() => null),
}));

import { foldElevation, foldAffectAccent, getUserState, getNilaQuestion } from "./modeEngine";
import { secureLocal } from "./secureLocal";
import { emaElevationSignal } from "./ema";
import { chatElevationSignal } from "./chatElevation";
import { todayAffectBucket } from "./chatAffect";
import { localDateKey } from "./storageUtils";

describe("foldElevation — EMA elevation folded into the derived state (manic-first)", () => {
  it("no EMA signal → base passes through unchanged", () => {
    expect(foldElevation("calm", "none")).toBe("calm");
    expect(foldElevation("low", "none")).toBe("low");
    expect(foldElevation(null, "none")).toBe(null);
  });

  it("a sustained EMA rise upgrades a CALM or UNKNOWN state to elevated (protective quieting)", () => {
    expect(foldElevation("calm", "elevated")).toBe("elevated");
    expect(foldElevation("calm", "high")).toBe("elevated");
    expect(foldElevation(null, "elevated")).toBe("elevated");
  });

  it("NEVER overrides an explicit self-report of distress — respect what they said", () => {
    expect(foldElevation("anxious", "high")).toBe("anxious");
    expect(foldElevation("low", "elevated")).toBe("low");
  });

  it("leaves an already-elevated / crisis state as-is", () => {
    expect(foldElevation("elevated", "elevated")).toBe("elevated");
    expect(foldElevation("crisis", "high")).toBe("crisis");
  });
});

describe("foldAffectAccent — today's affect bucket folded into the derived state (never overrides self-report)", () => {
  it("passthrough when base is an explicit distress self-report", () => {
    expect(foldAffectAccent("anxious", { valence: -0.9, arousal: 0.9, count: 10 }, false)).toBe("anxious");
    expect(foldAffectAccent("low", { valence: -0.9, arousal: 0.9, count: 10 }, false)).toBe("low");
  });

  it("passthrough when base is already elevated", () => {
    expect(foldAffectAccent("elevated", { valence: -0.9, arousal: 0.9, count: 10 }, false)).toBe("elevated");
  });

  it("passthrough when there's no bucket, or fewer than 3 readings today", () => {
    expect(foldAffectAccent(null, null, false)).toBe(null);
    expect(foldAffectAccent(null, { valence: -0.9, arousal: 0.9, count: 2 }, false)).toBe(null);
  });

  it("passthrough when the average valence isn't clearly negative", () => {
    expect(foldAffectAccent(null, { valence: -0.3, arousal: 0.9, count: 5 }, false)).toBe(null);
  });

  it("promotes null to low/anxious on the arousal split, unconditional on check-in status", () => {
    expect(foldAffectAccent(null, { valence: -0.7, arousal: 0.1, count: 5 }, false)).toBe("low");
    expect(foldAffectAccent(null, { valence: -0.7, arousal: 0.5, count: 5 }, true)).toBe("anxious");
  });

  it("promotes calm to low/anxious ONLY when there's no check-in today", () => {
    expect(foldAffectAccent("calm", { valence: -0.7, arousal: 0.1, count: 5 }, false)).toBe("low");
    expect(foldAffectAccent("calm", { valence: -0.7, arousal: 0.5, count: 5 }, false)).toBe("anxious");
  });

  it("NEVER overrides a SAME-DAY explicit 'calm' self-report — the invalidation scenario the Fable review caught", () => {
    expect(foldAffectAccent("calm", { valence: -0.9, arousal: 0.9, count: 10 }, true)).toBe("calm");
  });
});

describe("getUserState — folds the EMA elevation signal into the check-in state", () => {
  beforeEach(() => {
    vi.mocked(secureLocal.getItem).mockReset();
    vi.mocked(emaElevationSignal).mockReset();
    vi.mocked(emaElevationSignal).mockReturnValue("none");
    vi.mocked(chatElevationSignal).mockReset();
    vi.mocked(chatElevationSignal).mockReturnValue("none");
    vi.mocked(todayAffectBucket).mockReset();
    vi.mocked(todayAffectBucket).mockReturnValue(null);
  });

  it("calm check-in + rising EMA → elevated (the signal now reaches the pixels)", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(
      JSON.stringify([{ date: "2026-07-11", emotion: "Calm (Nila)", intensity: 4 }]),
    );
    vi.mocked(emaElevationSignal).mockReturnValue("elevated");
    expect(getUserState()).toBe("elevated");
  });

  it("low check-in + rising EMA → stays low (self-report wins)", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(
      JSON.stringify([{ date: "2026-07-11", emotion: "Low (Nila)", intensity: 4 }]),
    );
    vi.mocked(emaElevationSignal).mockReturnValue("elevated");
    expect(getUserState()).toBe("low");
  });

  it("no check-in at all + rising EMA → elevated", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(null);
    vi.mocked(emaElevationSignal).mockReturnValue("high");
    expect(getUserState()).toBe("elevated");
  });

  it("calm check-in + no EMA rise → unchanged (calm)", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(
      JSON.stringify([{ date: "2026-07-11", emotion: "Calm (Nila)", intensity: 4 }]),
    );
    expect(getUserState()).toBe("calm");
  });

  it("calm check-in + an active CHAT elevation latch → elevated (typed manic content settles the UI)", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(
      JSON.stringify([{ date: "2026-07-11", emotion: "Calm (Nila)", intensity: 4 }]),
    );
    vi.mocked(chatElevationSignal).mockReturnValue("elevated");
    expect(getUserState()).toBe("elevated");
  });

  it("low check-in + chat elevation latch → stays low (self-report still wins)", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(
      JSON.stringify([{ date: "2026-07-11", emotion: "Low (Nila)", intensity: 4 }]),
    );
    vi.mocked(chatElevationSignal).mockReturnValue("high");
    expect(getUserState()).toBe("low");
  });

  it("calm check-in TODAY + strongly negative affect bucket → stays calm (same-day self-report protected)", () => {
    const today = localDateKey();
    vi.mocked(secureLocal.getItem).mockReturnValue(
      JSON.stringify([{ date: today, emotion: "Calm (Nila)", intensity: 4 }]),
    );
    vi.mocked(todayAffectBucket).mockReturnValue({ valence: -0.9, arousal: 0.9, count: 10 });
    expect(getUserState()).toBe("calm");
  });

  it("no check-in at all + strongly negative affect bucket → promotes to low", () => {
    vi.mocked(secureLocal.getItem).mockReturnValue(null);
    vi.mocked(todayAffectBucket).mockReturnValue({ valence: -0.7, arousal: 0.1, count: 5 });
    expect(getUserState()).toBe("low");
  });
});

// Wave 3 Group I (2026-07-12) — "What's your intention for today?" used to be a free-text chat
// question here, one of three independent, contradictory "intention" surfaces (synthesis finding).
// It's now handled exclusively by the structured if-then DailyIntentionCard (TodayScreen.tsx), so
// this chat-embedded prompt must no longer ask for it. Locks the surface-removal in so it can't
// silently regress back into a duplicate, unstructured intention question.
describe("getNilaQuestion — morning checked-in branch no longer asks the free-text intention question", () => {
  it("does not return the old free-text intention prompt once checked in", () => {
    const q = getNilaQuestion("morning", "calm", true);
    expect(q).not.toMatch(/intention/i);
  });

  it("still asks about sleep before the day's check-in has happened", () => {
    expect(getNilaQuestion("morning", null, false)).toBe("How did you sleep?");
  });
});
