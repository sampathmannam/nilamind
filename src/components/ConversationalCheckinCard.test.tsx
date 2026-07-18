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
  appendToSecureArray: <T,>(key: string, item: T) => {
    const arr = JSON.parse(store.get(key) ?? "[]") as T[];
    arr.push(item);
    store.set(key, JSON.stringify(arr));
    return arr;
  },
  SENSITIVE_KEYS: [],
}));

import ConversationalCheckinCard from "./ConversationalCheckinCard";
import { savePendingCheckinDraft, getPendingCheckinDraft, type CheckinDraftProposal } from "../services/checkinDraft";
import { hasCheckinToday } from "../services/checkin";
import { localDateKey } from "../services/storageUtils";

const TODAY = localDateKey();
const draft: CheckinDraftProposal = { mood: "Anxious", intensity: 7, energy: 2, contextTag: "Work", granularEmotion: "restless", confidence: 0.8, date: TODAY };

afterEach(cleanup);
beforeEach(() => { store.clear(); });

describe("ConversationalCheckinCard", () => {
  it("renders nothing when there is no pending draft", () => {
    const { container } = render(<ConversationalCheckinCard go={vi.fn()} onResolved={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the drafted state read back in plain words", () => {
    savePendingCheckinDraft(draft);
    render(<ConversationalCheckinCard go={vi.fn()} onResolved={vi.fn()} />);
    expect(screen.getByText(/anxious.*restless/i)).toBeTruthy();
    expect(screen.getByText(/want me to log that/i)).toBeTruthy();
  });

  it("'Yes, log it' writes the check-in and clears the draft", () => {
    savePendingCheckinDraft(draft);
    const onResolved = vi.fn();
    render(<ConversationalCheckinCard go={vi.fn()} onResolved={onResolved} />);
    expect(hasCheckinToday(TODAY)).toBe(false);
    fireEvent.click(screen.getByText("Yes, log it"));
    expect(hasCheckinToday(TODAY)).toBe(true);
    expect(getPendingCheckinDraft()).toBeNull();
    expect(onResolved).toHaveBeenCalled();
  });

  it("'Not quite' opens the manual form, drops the draft, and logs nothing automatically", () => {
    savePendingCheckinDraft(draft);
    const go = vi.fn();
    render(<ConversationalCheckinCard go={go} onResolved={vi.fn()} />);
    fireEvent.click(screen.getByText("Not quite"));
    expect(go).toHaveBeenCalledWith("ema_checkin");
    expect(getPendingCheckinDraft()).toBeNull();
    expect(hasCheckinToday(TODAY)).toBe(false); // nothing auto-logged
  });

  it("dismiss ('Not now') hides the draft for the day without logging", () => {
    savePendingCheckinDraft(draft);
    render(<ConversationalCheckinCard go={vi.fn()} onResolved={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("Not now"));
    expect(getPendingCheckinDraft()).toBeNull();
    expect(hasCheckinToday(TODAY)).toBe(false);
  });
});
