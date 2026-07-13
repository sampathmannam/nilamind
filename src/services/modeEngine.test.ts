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

import { foldElevation, getUserState, getNilaQuestion } from "./modeEngine";
import { secureLocal } from "./secureLocal";
import { emaElevationSignal } from "./ema";
import { chatElevationSignal } from "./chatElevation";

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

describe("getUserState — folds the EMA elevation signal into the check-in state", () => {
  beforeEach(() => {
    vi.mocked(secureLocal.getItem).mockReset();
    vi.mocked(emaElevationSignal).mockReset();
    vi.mocked(emaElevationSignal).mockReturnValue("none");
    vi.mocked(chatElevationSignal).mockReset();
    vi.mocked(chatElevationSignal).mockReturnValue("none");
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
