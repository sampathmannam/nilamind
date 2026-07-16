// @vitest-environment jsdom
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
vi.mock("../services/journalPrompt", () => ({
  getDailyPrompt: vi.fn(async (mode: string) => `PROMPT:${mode}`),
}));
const reminderStore = new Map<string, string>();
vi.mock("../services/diaryReminderPrefs", () => ({
  getDiaryReminderPrefs: () => {
    const raw = reminderStore.get("prefs");
    return raw ? JSON.parse(raw) : { enabled: false, time: "20:00" };
  },
  setDiaryReminderPrefs: (p: Record<string, unknown>) => {
    const raw = reminderStore.get("prefs");
    const cur = raw ? JSON.parse(raw) : { enabled: false, time: "20:00" };
    reminderStore.set("prefs", JSON.stringify({ ...cur, ...p }));
  },
}));
const syncDiaryReminder = vi.fn(async () => ({ scheduled: true }));
const clearDiaryReminder = vi.fn(async () => {});
vi.mock("../services/notifications", () => ({
  syncDiaryReminder: () => syncDiaryReminder(),
  clearDiaryReminder: () => clearDiaryReminder(),
}));

import DiaryCardScreen from "./DiaryCardScreen";
import { getDailyIntention } from "../services/weeklyIntention";

afterEach(cleanup);
beforeEach(() => { store.clear(); reminderStore.clear(); syncDiaryReminder.mockClear(); clearDiaryReminder.mockClear(); });

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
      JSON.stringify({ if: "it's 8am", then: "go for a short walk", date: new Date().toISOString().split("T")[0] }),
    );
    render(<DiaryCardScreen />);
    expect(screen.getByText(/it's 8am/)).toBeTruthy();
    expect(getDailyIntention()?.if).toBe("it's 8am");
  });
});

describe("DiaryCardScreen — journal mode, daily prompt, and reminder (research-grounded additions)", () => {
  it("defaults to Free write mode and shows today's prompt for it", async () => {
    render(<DiaryCardScreen />);
    const freeChip = screen.getByRole("button", { name: "Free write" });
    expect(freeChip.getAttribute("aria-pressed")).toBe("true");
    expect(await screen.findByText(/PROMPT:free/)).toBeTruthy();
  });

  it("switching to Gratitude mode changes the placeholder and re-fetches the prompt for that mode", async () => {
    render(<DiaryCardScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Gratitude" }));
    expect(await screen.findByText(/PROMPT:gratitude/)).toBeTruthy();
    expect(screen.getByLabelText("Quick Notes").getAttribute("placeholder")).toMatch(/coffee/i);
  });

  it("dismissing the prompt hides it without affecting the note text", async () => {
    render(<DiaryCardScreen />);
    await screen.findByText(/PROMPT:free/);
    fireEvent.click(screen.getByLabelText("Dismiss prompt"));
    expect(screen.queryByText(/PROMPT:free/)).toBeNull();
  });

  it("reminder toggle is off by default and does not call syncDiaryReminder until switched on", () => {
    render(<DiaryCardScreen />);
    const toggle = screen.getByLabelText("Toggle journal reminder");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(syncDiaryReminder).not.toHaveBeenCalled();
  });

  it("turning the reminder on calls syncDiaryReminder; turning it off calls clearDiaryReminder", () => {
    render(<DiaryCardScreen />);
    const toggle = screen.getByLabelText("Toggle journal reminder");
    fireEvent.click(toggle);
    expect(syncDiaryReminder).toHaveBeenCalledTimes(1);
    fireEvent.click(toggle);
    expect(clearDiaryReminder).toHaveBeenCalledTimes(1);
  });

  it("saved entry persists journalMode", async () => {
    render(<DiaryCardScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Gratitude" }));
    await screen.findByText(/PROMPT:gratitude/); // wait for the mode switch to fully settle
    fireEvent.click(document.getElementById("save-diary-btn")!);
    const today = new Date().toISOString().split("T")[0];
    const saved = JSON.parse(store.get("nilamind_diary") || "{}");
    expect(saved[today]?.journalMode).toBe("gratitude");
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
    const today = new Date().toISOString().split("T")[0];
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
    const today = new Date().toISOString().split("T")[0];
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
    const today = new Date().toISOString().split("T")[0];
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
