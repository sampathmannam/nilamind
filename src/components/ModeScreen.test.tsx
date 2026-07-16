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
vi.mock("../services/secureLocal", async () => {
  const actual = await vi.importActual<typeof import("../services/secureLocal")>("../services/secureLocal");
  return {
    ...actual,
    secureLocal: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    },
  };
});

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

// Bug 3 fix test support (2026-07-12): the arm-request branch's §9 gate (shouldBlockForCrisisAsync) needs to
// be held pending on demand to exercise the race window. `armGateRef.current` overrides it when set; every
// other test leaves it null, which falls through to the REAL implementation (unchanged behavior for the
// existing arm-request test above, which relies on the real keyword scanner).
const { armGateRef } = vi.hoisted(() => ({
  armGateRef: { current: null as ((text: string) => Promise<boolean>) | null },
}));
vi.mock("../services/nilaSend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/nilaSend")>();
  return {
    ...actual,
    shouldBlockForCrisisAsync: (text: string) =>
      armGateRef.current ? armGateRef.current(text) : actual.shouldBlockForCrisisAsync(text),
  };
});

// jsdom has no vibrate API — Capacitor's HapticsWeb rejects, which is unrelated noise for this UI-wiring test.
vi.mock("../hooks/useHaptics", () => ({ hapticLight: async () => {}, hapticMedium: async () => {} }));

// sessionChat.ts keeps an in-memory `transcript` cache at module scope, independent of the mocked secureLocal
// `store` above — clearing `store` alone doesn't reset it. The existing crisis tests never noticed because every
// one of them ends by tripping hadCrisisRef, which itself calls clearSessionChat(). Non-crisis tests (the
// feedback-suggestion UI describe below) don't, so without an explicit reset a prior test's transcript leaks
// into the next test's freshly-mounted ModeScreen via getSessionChat() on mount.
import { clearSessionChat } from "../services/sessionChat";

// Feedback-suggestion UI (2026-07-12 Wave 3, Group F) — recordFeedback's returned id is what the follow-up
// prompt must pass to attachSuggestion, so the mock returns a deterministic id rather than the real uid().
let feedbackSeq = 0;
const recordFeedbackMock = vi.fn((reply: string, rating: string) => ({
  id: `fb_test_${++feedbackSeq}`, at: "2026-07-12", rating, reply,
}));
const attachSuggestionMock = vi.fn();
vi.mock("../services/nilaFeedback", () => ({
  recordFeedback: (...args: unknown[]) => recordFeedbackMock(...(args as [string, string])),
  attachSuggestion: (...args: unknown[]) => attachSuggestionMock(...(args as [string, string])),
}));

import ModeScreen from "./ModeScreen";

afterEach(() => {
  cleanup();
  store.clear();
  clearSessionChat();
  sendToNilaMock.mockReset();
  suppressNudgesMock.mockReset();
  recordFeedbackMock.mockClear();
  attachSuggestionMock.mockReset();
  feedbackSeq = 0;
  armGateRef.current = null; // never leak a held-open §9 gate into another test
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

describe("ModeScreen — two-tier crisis surface wiring (2026-07-12 Wave 3, Task 1.3; retiered 2026-07-12 Bug 1 fix)", () => {
  it("keyword-floor hit (crisisTier:'full') still opens the full CrisisOverlay via onOpenCrisis", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "keyword", crisisTier: "full" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("i want to kill myself");
    await waitFor(() => expect(onOpenCrisis).toHaveBeenCalled());
    expect(document.getElementById("soft-crisis-card")).toBeNull();
  });

  // 2026-07-12 Bug 1 FIX (adversarial-review regression — see AGENTS.md guardrails / commit message for why
  // this is a correction, not a weakening): the UI decision must be driven by crisisTier, NOT crisisSource.
  // A classifier-only hit that is nonetheless a HIGH-CONFIDENCE disclosure (tier:'full') must get the full
  // takeover, exactly like a keyword hit — "classifier-only" is not a proxy for "low confidence".
  it("classifier-only HIGH-CONFIDENCE hit (crisisTier:'full') opens the full CrisisOverlay, NOT the soft card", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier", crisisTier: "full" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    // The proof case from the adversarial review: a genuine indirect disclosure that scores 0.8837 —
    // well above CRISIS_HIGH_CONFIDENCE_THRESHOLD — so a real send would resolve crisisTier:'full' too;
    // this test exercises the UI wiring directly via the mock, matching sendToNila.test.ts's real-gate proof.
    await sendMessage("everyone would be better off without me");
    await waitFor(() => expect(onOpenCrisis).toHaveBeenCalled());
    expect(document.getElementById("soft-crisis-card")).toBeNull();
  });

  it("classifier-only SOFT-tier hit (crisisTier:'soft') shows SoftCrisisCard instead of the full overlay", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier", crisisTier: "soft" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("nothing feels worth it anymore");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());
    expect(onOpenCrisis).not.toHaveBeenCalled();
  });

  it("a blocked hit with NO crisisTier fails closed to the full CrisisOverlay (?? 'full' fallback)", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("i want to kill myself");
    await waitFor(() => expect(onOpenCrisis).toHaveBeenCalled());
    expect(document.getElementById("soft-crisis-card")).toBeNull();
  });

  it("escalating from the soft card opens the full CrisisOverlay", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier", crisisTier: "soft" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("nothing feels worth it anymore");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());
    fireEvent.click(screen.getByText(/i could use support right now/i));
    expect(onOpenCrisis).toHaveBeenCalledOnce();
  });

  it("every crisis hit (both tiers) unconditionally fires suppressNudgesForCrisis", async () => {
    sendToNilaMock.mockResolvedValue({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier", crisisTier: "soft" });
    render(<ModeScreen />);
    await sendMessage("nothing feels worth it anymore");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());
    expect(suppressNudgesMock).toHaveBeenCalled();
  });

  it("dismissing the soft card does NOT un-latch hadCrisisRef — the session chat stays un-persisted on the next turn", async () => {
    sendToNilaMock.mockResolvedValueOnce({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "classifier", crisisTier: "soft" });
    render(<ModeScreen />);
    await sendMessage("nothing feels worth it anymore");
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

// Bug 2 (MEDIUM, confirmed by the same adversarial review): a stale SoftCrisisCard from an earlier soft-tier
// turn did not clear when a LATER message triggered the full takeover. Repro: soft card shows for message A
// → message B is a full-tier hit → CrisisOverlay opens (visually covering the card) → user dismisses the
// overlay → the STALE soft card reappeared underneath, re-asking "Can I pause here?" right after the user
// just went through the full safety-plan flow. Fix: the full-takeover branch of openCrisis() must
// unconditionally clear softCrisisCard first.
describe("ModeScreen — Bug 2 fix: stale SoftCrisisCard clears on a later full-tier hit (2026-07-12)", () => {
  it("a later keyword/full-tier hit clears an earlier stale soft card instead of leaving it stacked underneath the overlay", async () => {
    sendToNilaMock.mockResolvedValueOnce({ reply: "soft reply", reachedAI: false, blocked: true, crisisSource: "classifier", crisisTier: "soft" });
    const onOpenCrisis = vi.fn();
    render(<ModeScreen onOpenCrisis={onOpenCrisis} />);
    await sendMessage("nothing feels worth it anymore");
    await waitFor(() => expect(document.getElementById("soft-crisis-card")).toBeTruthy());

    // Message B, before the soft card is dismissed: a full-tier (keyword-floor) hit.
    sendToNilaMock.mockResolvedValueOnce({ reply: "crisis reply", reachedAI: false, blocked: true, crisisSource: "keyword", crisisTier: "full" });
    await sendMessage("i want to kill myself");
    await waitFor(() => expect(onOpenCrisis).toHaveBeenCalled());

    // The stale soft card must be gone — NOT stacked underneath the full-screen CrisisOverlay, and NOT
    // waiting to reappear once the overlay is dismissed.
    expect(document.getElementById("soft-crisis-card")).toBeNull();
  });
});

// Bug 3 (narrower race condition, confirmed): the arm-request branch never called setLoading(true) before its
// `await shouldBlockForCrisisAsync(msg)`, unlike the main send path. This left the Send button enabled during
// that await window, so a second message could be sent concurrently and interleave with the still-pending §9
// verdict. Fix: set the same loading lock before the arm-request branch's await, matching the main path.
describe("ModeScreen — Bug 3 fix: arm-request branch sets loading before its async §9 check (2026-07-12)", () => {
  it("the Send button is disabled while the arm-request's §9 gate is pending, blocking a concurrent second send", async () => {
    // Hold the arm-request's §9 gate open indefinitely so we can observe the pending window.
    let resolveGate!: (v: boolean) => void;
    const pending = new Promise<boolean>((res) => { resolveGate = res; });
    armGateRef.current = () => pending;

    render(<ModeScreen />);
    openTextInput();
    const input = screen.getByPlaceholderText("Type a message...");

    // Message A: an arm-request, whose §9 gate we hold pending.
    fireEvent.change(input, { target: { value: "check on me tonight" } });
    fireEvent.click(screen.getByLabelText("Send"));

    // The user types a second message B while A's gate is still unresolved.
    fireEvent.change(input, { target: { value: "message B" } });

    // Without the fix, `loading` never became true during the arm-request branch's await, so the Send button
    // (disabled={!inputText.trim() || loading}) would be enabled again as soon as inputText was non-empty —
    // this is the exact race the bug describes. With the fix, it must stay disabled until A resolves.
    expect((screen.getByLabelText("Send") as HTMLButtonElement).disabled).toBe(true);

    // Attempting to send anyway must be a no-op: handleSendMessage's top-of-function `if (!msg || loading)
    // return` guard must block re-entry, so message B must never appear in the transcript while A is pending.
    fireEvent.click(screen.getByLabelText("Send"));
    expect(screen.queryByText("message B")).toBeNull();

    resolveGate(false); // let A resolve as "not a crisis" so the pending promise doesn't leak into other tests
    await waitFor(() => expect((screen.getByLabelText("Send") as HTMLButtonElement).disabled).toBe(false));
  });
});

// Feedback-suggestion UI (2026-07-12 Wave 3, Group F) — completes the already-built-but-unwired
// attachSuggestion() flow: the 👎 button already calls recordFeedback(m.content, "down"); this adds a
// lightweight, dismissable, one-tap "What would've helped?" follow-up that attaches the typed suggestion
// to the SAME feedback entry (never a forced second step).
describe("ModeScreen — feedback-suggestion UI (2026-07-12 Wave 3, Group F)", () => {
  async function sendAndGetReply(replyText: string) {
    sendToNilaMock.mockResolvedValueOnce({ reply: replyText, reachedAI: true, blocked: false });
    render(<ModeScreen />);
    await sendMessage("hello");
    await waitFor(() => expect(screen.getByText(replyText)).toBeTruthy());
  }

  it("tapping thumbs-down on a reply shows a one-tap 'what would've helped' prompt", async () => {
    await sendAndGetReply("a reply");
    expect(document.getElementById("feedback-suggestion-prompt")).toBeNull();
    // Use getAllByLabelText and pick the last one — the greeting message also has feedback buttons
    const downButtons = screen.getAllByLabelText("Mark as not helpful");
    fireEvent.click(downButtons[downButtons.length - 1]);
    expect(recordFeedbackMock).toHaveBeenCalledWith("a reply", "down");
    expect(document.getElementById("feedback-suggestion-prompt")).toBeTruthy();
  });

  it("tapping thumbs-up does NOT show the suggestion prompt (only a down-rating asks what would help)", async () => {
    await sendAndGetReply("a good reply");
    const upButtons = screen.getAllByLabelText("Mark as helpful");
    fireEvent.click(upButtons[upButtons.length - 1]);
    expect(document.getElementById("feedback-suggestion-prompt")).toBeNull();
  });

  it("submitting a typed suggestion calls attachSuggestion with the exact feedback id, then closes the prompt", async () => {
    await sendAndGetReply("a reply");
    const downButtons = screen.getAllByLabelText("Mark as not helpful");
    fireEvent.click(downButtons[downButtons.length - 1]);
    const input = screen.getByPlaceholderText(/what would.*helped/i);
    fireEvent.change(input, { target: { value: "be gentler" } });
    fireEvent.click(screen.getByLabelText("Share what would help"));
    expect(attachSuggestionMock).toHaveBeenCalledWith("fb_test_1", "be gentler");
    expect(document.getElementById("feedback-suggestion-prompt")).toBeNull();
  });

  it("dismissing without submitting never calls attachSuggestion and closes the prompt (optional, not forced)", async () => {
    await sendAndGetReply("a reply");
    const downButtons = screen.getAllByLabelText("Mark as not helpful");
    fireEvent.click(downButtons[downButtons.length - 1]);
    expect(document.getElementById("feedback-suggestion-prompt")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Not now"));
    expect(attachSuggestionMock).not.toHaveBeenCalled();
    expect(document.getElementById("feedback-suggestion-prompt")).toBeNull();
  });
});

describe("in-moment skill suggestion (2026-07-16 dedupe)", () => {
  it("shows exactly one skill suggestion (no pinned duplicate) and it uses buttons", async () => {
    sendToNilaMock.mockResolvedValueOnce({ reply: "That sounds hard.", reachedAI: true, blocked: false });
    render(<ModeScreen />);
    await sendMessage("i feel so low and empty lately");
    await waitFor(() => expect(screen.getByText("That sounds hard.")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("Try this skill")).toBeTruthy());
    expect(document.getElementById("skill-offer-card")).toBeNull();
    expect(screen.getAllByText("Opposite Action")).toHaveLength(1);
  });

  it("clicking Not now removes the skill suggestion without wiping the reply", async () => {
    sendToNilaMock.mockResolvedValueOnce({ reply: "That sounds hard.", reachedAI: true, blocked: false });
    render(<ModeScreen />);
    await sendMessage("i feel so low and empty lately");
    await waitFor(() => expect(screen.getByText("Try this skill")).toBeTruthy());
    fireEvent.click(screen.getByText("Not now"));
    await waitFor(() => expect(screen.queryByText("Try this skill")).toBeNull());
    expect(screen.getByText("That sounds hard.")).toBeTruthy();
  });
});
