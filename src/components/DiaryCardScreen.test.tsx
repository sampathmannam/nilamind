// @vitest-environment jsdom
import { localDateKey } from "../services/storageUtils";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));
vi.mock("../hooks/useHaptics", () => ({ hapticMedium: vi.fn() }));
vi.mock("../services/coachAssist", () => ({ analyzeQuickNote: vi.fn() }));
vi.mock("../services/voice", () => ({ listenOnce: vi.fn(), stopListening: vi.fn() }));

import DiaryCardScreen from "./DiaryCardScreen";
import { getDailyIntention } from "../services/weeklyIntention";

afterEach(cleanup);
beforeEach(() => { store.clear(); });

// Wave 3 Group I (2026-07-12) — the diary's free-text "Morning Intention" field was one of three
// independent, contradictory "intention" surfaces (synthesis finding). It's replaced here by the
// same structured DailyIntentionCard used on the Today hub, backed by the ONE canonical
// weeklyIntention.ts daily-intention store — not a separate diary-local free-text field.
describe("DiaryCardScreen — Part 3 now defers to the unified daily-intention store", () => {
  it("no longer renders the old free-text 'Morning Intention' input", () => {
    render(<DiaryCardScreen />);
    expect(screen.queryByPlaceholderText(/note to self/i)).toBeNull();
  });

  it("renders the shared if-then DailyIntentionCard picker instead", () => {
    render(<DiaryCardScreen />);
    expect(screen.getByLabelText("If")).toBeTruthy();
    expect(screen.getByLabelText("Then")).toBeTruthy();
  });

  it("reflects an intention already set elsewhere (e.g. from the Today hub) via the shared store", () => {
    store.set(
      "nilamind_daily_intention",
      JSON.stringify({ if: "it's 8am", then: "go for a short walk", date: localDateKey() }),
    );
    render(<DiaryCardScreen />);
    expect(screen.getByText(/it's 8am/)).toBeTruthy();
    expect(getDailyIntention()?.if).toBe("it's 8am");
  });
});

// Research-grounded redesign (product-brainstorming session, 2026-07-16): the standard DBT diary
// card's highest-priority tier — target-behavior urges — was entirely missing. Rating an urge is
// purely self-report and never surfaces the crisis flow on its own (user-confirmed design decision).
describe("DiaryCardScreen — urges & target behaviors (research-grounded redesign)", () => {
  it("renders the default target-behavior urges at zero intensity, with no acted-on toggle shown", () => {
    render(<DiaryCardScreen />);
    expect(screen.getByText("Urge to self-harm")).toBeTruthy();
    expect(screen.getByText("Suicidal urge")).toBeTruthy();
    expect(screen.getByText("Urge to use substances")).toBeTruthy();
    expect(screen.queryByLabelText(/Did you act on: Urge to self-harm/)).toBeNull();
  });

  it("raising an urge above zero reveals the acted-on toggle; saving persists intensity and actedOn", () => {
    render(<DiaryCardScreen />);
    fireEvent.click(screen.getByLabelText("Urge to self-harm intensity 3"));
    const toggle = screen.getByLabelText(/Did you act on: Urge to self-harm/);
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(document.getElementById("save-diary-btn")!);
    const today = localDateKey();
    const saved = JSON.parse(store.get("nilamind_diary") || "{}");
    const selfHarm = saved[today]?.urges?.find((u: { key: string }) => u.key === "selfHarm");
    expect(selfHarm).toMatchObject({ intensity: 3, actedOn: true });
  });

  it("dropping an urge back to zero hides and clears the acted-on toggle", () => {
    render(<DiaryCardScreen />);
    fireEvent.click(screen.getByLabelText("Urge to self-harm intensity 2"));
    fireEvent.click(screen.getByLabelText(/Did you act on: Urge to self-harm/));
    fireEvent.click(screen.getByLabelText("Urge to self-harm intensity 0"));
    expect(screen.queryByLabelText(/Did you act on: Urge to self-harm/)).toBeNull();

    fireEvent.click(document.getElementById("save-diary-btn")!);
    const today = localDateKey();
    const saved = JSON.parse(store.get("nilamind_diary") || "{}");
    const selfHarm = saved[today]?.urges?.find((u: { key: string }) => u.key === "selfHarm");
    expect(selfHarm).toMatchObject({ intensity: 0, actedOn: false });
  });
});

describe("DiaryCardScreen — skill effectiveness (research-grounded redesign)", () => {
  it("tapping a skill cycles unrated -> tried, no help -> tried, helped -> unrated, and saves it", () => {
    render(<DiaryCardScreen />);
    const skillBtn = screen.getByRole("button", { name: /^TIPP/ });

    fireEvent.click(skillBtn); // unrated -> tried, no help
    expect(skillBtn.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Tried — didn't help/)).toBeTruthy();

    fireEvent.click(skillBtn); // -> tried, helped
    expect(screen.getByText(/Tried — helped/)).toBeTruthy();

    fireEvent.click(document.getElementById("save-diary-btn")!);
    const today = localDateKey();
    let saved = JSON.parse(store.get("nilamind_diary") || "{}");
    expect(saved[today]?.skillsUsed).toContain("TIPP");
    expect(saved[today]?.skillEffectiveness?.TIPP).toBe("tried_helped");

    fireEvent.click(skillBtn); // -> back to unrated
    expect(skillBtn.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(document.getElementById("save-diary-btn")!);
    saved = JSON.parse(store.get("nilamind_diary") || "{}");
    expect(saved[today]?.skillsUsed).not.toContain("TIPP");
    expect(saved[today]?.skillEffectiveness?.TIPP).toBeUndefined();
  });
});

// 2026-08-06 audit fix: the discrete-emotion chip picker (Feature 6, "give the wave a name") was
// shipped and wired to state/persistence, but had ZERO test coverage anywhere.
describe("DiaryCardScreen — discrete emotion chips (Feature 6)", () => {
  it("renders the chip group with the 10 curated discrete emotions", () => {
    render(<DiaryCardScreen />);
    const group = screen.getByRole("group", { name: /discrete emotion labels/i });
    expect(group).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prickly" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Heavy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Calm" })).toBeTruthy();
  });

  it("toggles a chip on tap, and off on a second tap", () => {
    render(<DiaryCardScreen />);
    const chip = screen.getByRole("button", { name: "Numb" });
    expect(chip.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(chip);
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });

  it("allows selecting more than one chip at once", () => {
    render(<DiaryCardScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Prickly" }));
    fireEvent.click(screen.getByRole("button", { name: "Wired" }));
    expect(screen.getByRole("button", { name: "Prickly" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Wired" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("persists selected chips on save, under discreteEmotions", () => {
    render(<DiaryCardScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Heavy" }));
    fireEvent.click(screen.getByRole("button", { name: "Empty" }));
    fireEvent.click(document.getElementById("save-diary-btn")!);

    const today = localDateKey();
    const saved = JSON.parse(store.get("nilamind_diary") || "{}");
    expect(saved[today]?.discreteEmotions).toEqual(["heavy", "empty"]);
  });

  it("reloads previously-saved chip selections when reopened on the same date", () => {
    const today = localDateKey();
    store.set("nilamind_diary", JSON.stringify({
      [today]: { date: today, emotions: {}, skillsUsed: [], discreteEmotions: ["furious"] },
    }));
    render(<DiaryCardScreen />);
    expect(screen.getByRole("button", { name: "Furious" }).getAttribute("aria-pressed")).toBe("true");
  });
});
