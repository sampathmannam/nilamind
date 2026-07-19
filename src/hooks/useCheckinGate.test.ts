// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCheckinGate } from "./useCheckinGate";

describe("useCheckinGate", () => {
  it("shows the check-in when the user hasn't checked in today", () => {
    const { result } = renderHook(() => useCheckinGate(false));
    expect(result.current.showCheckin).toBe(true);
  });

  it("hides the check-in when the user already checked in today", () => {
    const { result } = renderHook(() => useCheckinGate(true));
    expect(result.current.showCheckin).toBe(false);
  });

  it("hideCheckin() dismisses the card", () => {
    const { result } = renderHook(() => useCheckinGate(false));
    act(() => result.current.hideCheckin());
    expect(result.current.showCheckin).toBe(false);
  });

  it("init reads hasCheckedInToday only at mount (a later prop change does not re-show)", () => {
    const { result, rerender } = renderHook(({ done }) => useCheckinGate(done), {
      initialProps: { done: true },
    });
    expect(result.current.showCheckin).toBe(false);
    rerender({ done: false }); // useState initializer ran once — must NOT re-show
    expect(result.current.showCheckin).toBe(false);
  });
});
