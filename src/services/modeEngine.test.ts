import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the two storage-backed reads getUserState depends on, so we can assert the elevation-folding
// wiring deterministically (mirrors the vi.mock pattern in CrisisOverlay.test.tsx).
vi.mock("./secureLocal", () => ({
  secureLocal: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  onPersistError: () => () => {},
}));
vi.mock("./ema", () => ({ emaElevationSignal: vi.fn(() => "none") }));

import { foldElevation, getUserState } from "./modeEngine";
import { secureLocal } from "./secureLocal";
import { emaElevationSignal } from "./ema";

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
});
