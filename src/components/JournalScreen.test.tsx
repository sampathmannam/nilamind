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
vi.mock("../services/notifications", () => ({
  syncDiaryReminder: vi.fn(async () => ({ scheduled: true })),
  clearDiaryReminder: vi.fn(async () => {}),
}));
let crisisResult = false;
vi.mock("../services/crisisClassifier", () => ({
  detectCrisis: vi.fn(async () => crisisResult),
}));
const saveEmaEntry = vi.fn();
vi.mock("../services/ema", () => ({
  saveEmaEntry: (e: unknown) => saveEmaEntry(e),
  emaDateKey: () => "2026-07-16",
}));

import JournalScreen from "./JournalScreen";

afterEach(cleanup);
beforeEach(() => { store.clear(); reminderStore.clear(); crisisResult = false; saveEmaEntry.mockClear(); });

describe("JournalScreen", () => {
  it("renders an empty feed with no entries", () => {
    render(<JournalScreen />);
    expect(screen.getByLabelText("Journal entry text")).toBeTruthy();
    expect(screen.queryByText(/TODAY/)).toBeNull();
  });

  it("saving a free-write entry adds it to the feed under TODAY", async () => {
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "felt good today" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(await screen.findByText(/felt good today/)).toBeTruthy();
    expect(screen.getByText("TODAY")).toBeTruthy();
  });

  it("clears the composer after a successful save", async () => {
    render(<JournalScreen />);
    const textarea = screen.getByLabelText("Journal entry text") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "an entry" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    await screen.findByText(/an entry/);
    expect(textarea.value).toBe("");
  });

  it("does not save an empty entry", () => {
    render(<JournalScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(screen.queryByText("TODAY")).toBeNull();
  });

  it("switching to Gratitude mode changes the placeholder", async () => {
    render(<JournalScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Gratitude" }));
    await screen.findByText(/PROMPT:gratitude/);
    expect(screen.getByLabelText("Journal entry text").getAttribute("placeholder")).toMatch(/coffee/i);
  });

  it("a crisis-flagged entry is NOT saved to the feed and shows the crisis card instead (draft stays in the textarea)", async () => {
    crisisResult = true;
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "distressing text" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    expect(await screen.findByText(/matters more than this note/i)).toBeTruthy();
    expect(screen.queryByText("TODAY")).toBeNull(); // no feed entry was created
  });

  it("tapping a mood option calls saveEmaEntry with the chosen valence", async () => {
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "good day" } });
    fireEvent.click(screen.getByLabelText("Mood: Good"));
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    await screen.findByText(/good day/);
    expect(saveEmaEntry).toHaveBeenCalledWith(expect.objectContaining({ valence: 1, trigger: "user_initiated" }));
  });

  it("deleting an entry removes it from the feed", async () => {
    render(<JournalScreen />);
    fireEvent.change(screen.getByLabelText("Journal entry text"), { target: { value: "to be deleted" } });
    fireEvent.click(screen.getByRole("button", { name: "Save entry" }));
    await screen.findByText(/to be deleted/);
    fireEvent.click(screen.getByText(/to be deleted/)); // expand row
    fireEvent.click(screen.getByRole("button", { name: "Delete entry" }));
    expect(screen.queryByText(/to be deleted/)).toBeNull();
  });

  it("renders the reminder toggle, off by default", () => {
    render(<JournalScreen />);
    expect(screen.getByLabelText("Toggle journal reminder").getAttribute("aria-checked")).toBe("false");
  });
});
