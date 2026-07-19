// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../services/nilaFeedback", () => ({
  recordFeedback: vi.fn((_c: string, _v: string) => ({ id: "fb_1" })),
  attachSuggestion: vi.fn(),
}));
vi.mock("./useHaptics", () => ({ hapticLight: vi.fn() }));

import { useMessageFeedback } from "./useMessageFeedback";
import { recordFeedback, attachSuggestion } from "../services/nilaFeedback";

beforeEach(() => vi.clearAllMocks());

describe("useMessageFeedback", () => {
  it("rateUp records helpful + marks the message rated", () => {
    const { result } = renderHook(() => useMessageFeedback());
    act(() => result.current.rateUp("reply", 2));
    expect(recordFeedback).toHaveBeenCalledWith("reply", "up");
    expect(result.current.ratedMessages.has(2)).toBe(true);
    expect(result.current.suggestionPrompt).toBeNull(); // up does NOT open the suggestion prompt
  });

  it("rateDown records + opens the suggestion prompt for that index with the feedback id", () => {
    (recordFeedback as Mock).mockReturnValue({ id: "fb_9" });
    const { result } = renderHook(() => useMessageFeedback());
    act(() => result.current.rateDown("bad reply", 3));
    expect(recordFeedback).toHaveBeenCalledWith("bad reply", "down");
    expect(result.current.ratedMessages.has(3)).toBe(true);
    expect(result.current.suggestionPrompt).toEqual({ index: 3, feedbackId: "fb_9" });
  });

  it("submitSuggestion attaches non-empty text to the feedback id, then closes", () => {
    (recordFeedback as Mock).mockReturnValue({ id: "fb_5" });
    const { result } = renderHook(() => useMessageFeedback());
    act(() => result.current.rateDown("x", 1));
    act(() => result.current.setSuggestionText("try grounding next time"));
    act(() => result.current.submitSuggestion());
    expect(attachSuggestion).toHaveBeenCalledWith("fb_5", "try grounding next time");
    expect(result.current.suggestionPrompt).toBeNull();
    expect(result.current.suggestionText).toBe("");
  });

  it("submitSuggestion with blank text closes WITHOUT attaching", () => {
    (recordFeedback as Mock).mockReturnValue({ id: "fb_6" });
    const { result } = renderHook(() => useMessageFeedback());
    act(() => result.current.rateDown("x", 1));
    act(() => result.current.setSuggestionText("   "));
    act(() => result.current.submitSuggestion());
    expect(attachSuggestion).not.toHaveBeenCalled();
    expect(result.current.suggestionPrompt).toBeNull();
  });

  it("cancelSuggestion closes the prompt without attaching", () => {
    (recordFeedback as Mock).mockReturnValue({ id: "fb_7" });
    const { result } = renderHook(() => useMessageFeedback());
    act(() => result.current.rateDown("x", 1));
    act(() => result.current.cancelSuggestion());
    expect(attachSuggestion).not.toHaveBeenCalled();
    expect(result.current.suggestionPrompt).toBeNull();
  });

  it("dismissSkill marks the message's skill card dismissed", () => {
    const { result } = renderHook(() => useMessageFeedback());
    act(() => result.current.dismissSkill(4));
    expect(result.current.dismissedSkillMessages.has(4)).toBe(true);
  });

  it("reset clears ratings + skill dismissals (mirrors startNewConversation)", () => {
    const { result } = renderHook(() => useMessageFeedback());
    act(() => {
      result.current.rateUp("a", 0);
      result.current.dismissSkill(0);
    });
    act(() => result.current.reset());
    expect(result.current.ratedMessages.size).toBe(0);
    expect(result.current.dismissedSkillMessages.size).toBe(0);
  });
});
