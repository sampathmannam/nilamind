// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { MutableRefObject } from "react";
import type { NilaUiMessage } from "../services/nilaSend";

// Mock the storage leaf + the notification latch so we can assert the §9 persistence invariant directly —
// the whole point of extracting this seam (it was only testable through the full ModeScreen before).
vi.mock("../services/sessionChat", () => ({
  getSessionChat: vi.fn((): NilaUiMessage[] => []),
  setSessionChat: vi.fn(),
  clearSessionChat: vi.fn(),
}));
vi.mock("../services/notifications", () => ({ suppressNudgesForCrisis: vi.fn() }));

import { useCrisisGate } from "./useCrisisGate";
import { getSessionChat, setSessionChat, clearSessionChat } from "../services/sessionChat";
import { suppressNudgesForCrisis } from "../services/notifications";

const MSGS: NilaUiMessage[] = [{ role: "user", content: "hi" } as NilaUiMessage];

function ref(v: boolean): MutableRefObject<boolean> {
  return { current: v };
}

function mount(over: {
  hadCrisis?: boolean;
  pending?: boolean;
  messages?: NilaUiMessage[];
} = {}) {
  const hadCrisisRef = ref(over.hadCrisis ?? false);
  const crisisPendingRef = ref(over.pending ?? false);
  const setMessages = vi.fn();
  const onOpenCrisis = vi.fn();
  const clearNudges = vi.fn();
  const clearProtocol = vi.fn();
  const view = renderHook(() =>
    useCrisisGate({
      hadCrisisRef,
      crisisPendingRef,
      messages: over.messages ?? MSGS,
      setMessages,
      onOpenCrisis,
      clearNudges,
      clearProtocol,
    }),
  );
  return { view, hadCrisisRef, crisisPendingRef, setMessages, onOpenCrisis, clearNudges, clearProtocol };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getSessionChat as Mock).mockReturnValue([]);
});

describe("useCrisisGate — persist invariant (never persist a §9 crisis turn)", () => {
  it("NORMAL: no crisis, not pending, messages present → persists", () => {
    mount({ messages: MSGS });
    expect(setSessionChat).toHaveBeenCalledWith(MSGS);
    expect(clearSessionChat).not.toHaveBeenCalled();
  });

  it("LATCHED: a session that ever tripped §9 → clears the store, never persists", () => {
    mount({ hadCrisis: true, messages: MSGS });
    expect(clearSessionChat).toHaveBeenCalledTimes(1);
    expect(setSessionChat).not.toHaveBeenCalled();
  });

  it("PENDING: an unresolved §9 verdict → writes nothing (no persist, no clear)", () => {
    mount({ pending: true, messages: MSGS });
    expect(setSessionChat).not.toHaveBeenCalled();
    expect(clearSessionChat).not.toHaveBeenCalled();
  });

  it("EMPTY: no messages → nothing to persist", () => {
    mount({ messages: [] });
    expect(setSessionChat).not.toHaveBeenCalled();
  });
});

describe("useCrisisGate — restore on mount", () => {
  it("restores a saved in-progress conversation", () => {
    (getSessionChat as Mock).mockReturnValue(MSGS);
    const { setMessages } = mount({ messages: [] });
    expect(setMessages).toHaveBeenCalledWith(MSGS);
  });

  it("does nothing when nothing is saved", () => {
    (getSessionChat as Mock).mockReturnValue([]);
    const { setMessages } = mount({ messages: [] });
    expect(setMessages).not.toHaveBeenCalled();
  });
});

describe("useCrisisGate — openCrisis tiers", () => {
  it("detected + soft tier → inline soft card, NO full takeover, latches + wipes", () => {
    const h = mount();
    act(() => h.view.result.current.openCrisis(true, "soft"));
    expect(h.hadCrisisRef.current).toBe(true);
    expect(clearSessionChat).toHaveBeenCalled();
    expect(h.clearProtocol).toHaveBeenCalled();
    expect(suppressNudgesForCrisis).toHaveBeenCalled();
    expect(h.clearNudges).toHaveBeenCalled();
    expect(h.view.result.current.softCrisisCard).toBe(true);
    expect(h.onOpenCrisis).not.toHaveBeenCalled();
  });

  it("detected + full tier → full takeover, clears any stale soft card, latches", () => {
    const h = mount();
    act(() => h.view.result.current.openCrisis(true, "full"));
    expect(h.hadCrisisRef.current).toBe(true);
    expect(h.view.result.current.softCrisisCard).toBe(false);
    expect(h.onOpenCrisis).toHaveBeenCalledTimes(1);
  });

  it("detected + null tier (arm/ambiguous/fail-closed) → full takeover", () => {
    const h = mount();
    act(() => h.view.result.current.openCrisis(true));
    expect(h.hadCrisisRef.current).toBe(true);
    expect(h.onOpenCrisis).toHaveBeenCalledTimes(1);
  });

  it("PROACTIVE (detected=false, e.g. crisis-resources tap) → opens WITHOUT wiping the conversation", () => {
    const h = mount();
    (clearSessionChat as Mock).mockClear();
    act(() => h.view.result.current.openCrisis(false));
    expect(h.hadCrisisRef.current).toBe(false); // not latched
    expect(clearSessionChat).not.toHaveBeenCalled(); // in-progress chat preserved (#6)
    expect(h.clearNudges).toHaveBeenCalled(); // §9 still takes precedence over ambient nudges
    expect(h.onOpenCrisis).toHaveBeenCalledTimes(1);
  });
});
