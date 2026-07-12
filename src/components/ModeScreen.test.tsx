// @vitest-environment jsdom
// Two-tier crisis surface wiring (2026-07-12 Wave 3, Task 1.3) — ModeScreen's openCrisis() must branch on
// crisisSource: a keyword-floor hit keeps the exact unchanged full-screen CrisisOverlay (onOpenCrisis?.()),
// a classifier-only hit renders the inline SoftCrisisCard instead. All substance-level safety invariants
// (hadCrisisRef latch, clearSessionChat, cleared skill/protocol offers, suppressNudgesForCrisis) must stay
// UNCONDITIONAL on any detected crisis — only the rendering surface differs by source.
//
// sendToNila and the notification side effect are mocked so this test exercises ONLY the UI wiring — the
// crisis DETECTION logic itself is already covered by crisisClassifier.test.ts and sendToNila.test.ts.
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

// jsdom doesn't implement these — stub them so NilaFace (useReducedMotion) and the message-list
// scroll-to-bottom effect can mount/run without throwing (unrelated to the crisis wiring under test).
window.matchMedia = window.matchMedia || ((query: string) => ({
  matches: false, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const store = new Map<string, string>();
vi.mock("../services/secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

vi.mock("../services/modeEngine", () => ({
  getCurrentMode: () => ({ timeMode: "day", userState: "calm", hasCheckedIn: true, inCrisis: false }),
  getGreeting: () => "Hi",
  getNilaQuestion: () => "How are you?",
}));

const sendToNilaMock = vi.fn();
vi.mock("../services/sendToNila", () => ({
  sendToNila: (...args: unknown[]) => sendToNilaMock(...args),
}));

const suppressNudgesMock = vi.fn();
vi.mock("../services/notifications", () => ({
  suppressNudgesForCrisis: (...args: unknown[]) => suppressNudgesMock(...args),
}));

// jsdom has no vibrate API — Capacitor's HapticsWeb rejects, which is unrelated noise for this UI-wiring test.
vi.mock("../hooks/useHaptics", () => ({ hapticLight: async () => {}, hapticMedium: async () => {} }));

import ModeScreen from "./ModeScreen";

afterEach(() => {
  cleanup();
  store.clear();
  sendToNilaMock.mockReset();
  suppressNudgesMock.mockReset();
});

function openTextInput() {
  // The keyboard-toggle button only renders while the text input is hidden — once shown (e.g. after a prior
  // send in the same test), it stays shown, so this is a no-op on subsequent calls.
  const toggle = screen.queryByLabelText("Type a message");
  if (toggle) fireEvent.click(toggle);
}

async function sendMessage(text: string) {
  openTextInput();
  const input = screen.getByPlaceholderText("Type a message...");
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByLabelText("Send"));
}

describe("ModeScreen — two-tier crisis surface wiring (2026-07-12 Wave 3, Task 1.3)", () => {
  it("keyword-floor hit (crisisSource:'keyword') still opens the full CrisisOverlay via onOpenCrisis", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "keyword" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("i want to kill myself");
    await waitFor(() => expect(onOpenCrisis).toHaveBeenCalled());
    expect(document.getElementById("soft-crisis-card")).toBeNull();
  });

  it("classifier-only hit (crisisSource:'classifier') shows SoftCrisisCard instead of the full overlay", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("everyone would be better off without me");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());
    expect(onOpenCrisis).not.toHaveBeenCalled();
  });

  it("a blocked hit with NO crisisSource fails closed to the full CrisisOverlay (?? 'keyword' fallback)", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("i want to kill myself");
    await waitFor(() => expect(onOpenCrisis).toHaveBeenCalled());
    expect(document.getElementById("soft-crisis-card")).toBeNull();
  });

  it("escalating from the soft card opens the full CrisisOverlay", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("everyone would be better off without me");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());
    fireEvent.click(screen.getByText(/i could use support right now/i));
    expect(onOpenCrisis).toHaveBeenCalledOnce();
  });

  it("every crisis hit (both tiers) unconditionally fires suppressNudgesForCrisis", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier" });
    render(<ModeScreen />);
    await sendMessage("everyone would be better off without me");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());
    expect(suppressNudgesMock).toHaveBeenCalled();
  });

  it("dismissing the soft card does NOT un-latch hadCrisisRef — the session chat stays un-persisted on the next turn", async () => {
    sendToNilaMock.mockResolvedValueOnce({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier" });
    render(<ModeScreen />);
    await sendMessage("everyone would be better off without me");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());

    fireEvent.click(screen.getByText(/i'm okay, keep going/i));
    expect(document.getElementById("soft-crisis-card")).toBeNull();

    sendToNilaMock.mockResolvedValueOnce({ reply: "I'm here.", reachedAI: true, blocked: false });
    await sendMessage("still feeling off");
    await waitFor(() => expect(sendToNilaMock).toHaveBeenCalledTimes(2));
    // hadCrisisRef stays latched across the soft-card dismissal → the persist effect keeps clearing/never
    // writes the session store, exactly as it does for a keyword-floor hit today.
    expect(store.has("nilamind_session_chat")).toBe(false);
  });

  it("arm-request path with a keyword crisis still opens the full takeover (no source, fails closed)", async () => {
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("check on me — i want to kill myself");
    await waitFor(() => expect(onOpenCrisis).toHaveBeenCalled());
    expect(document.getElementById("soft-crisis-card")).toBeNull();
    expect(sendToNilaMock).not.toHaveBeenCalled(); // arm-request short-circuits before sendToNila
  });
});
