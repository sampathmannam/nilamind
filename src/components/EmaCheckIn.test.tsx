// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import EmaCheckIn from "./EmaCheckIn";
import { loadEmaEntries } from "../services/ema";

// re-audit #1 (§9): the EMA note is free text persisted on "Done". A crisis disclosure typed there must
// route to the crisis surface and must NOT be silently stored as a mood note. The plan's "EMA skips crisis
// detection" is correct for the mood chip (a sad face isn't a crisis) but wrong for the free-text field.

// jsdom exposes localStorage on window, but ls() reads globalThis.localStorage — stub a Map-backed store
// (same pattern as ema.test.ts) so persistence is deterministic under the render env.
const mockStore = new Map<string, string>();
beforeEach(() => {
  mockStore.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => mockStore.get(k) ?? null,
    setItem: (k: string, v: string) => mockStore.set(k, v),
    removeItem: (k: string) => mockStore.delete(k),
    clear: () => mockStore.clear(),
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

/** Drive the 3-step micro-check-in (valence → energy → note) and tap Done. */
function driveToNote(note: string) {
  fireEvent.click(document.getElementById("ema-valence-1")!); // pick valence → energy step
  fireEvent.click(screen.getByText("Moderate"));              // pick energy → note step
  fireEvent.change(screen.getByPlaceholderText(/two-word note/i), { target: { value: note } });
  fireEvent.click(document.getElementById("ema-save")!);      // Done
}

describe("EmaCheckIn — §9 note gate (re-audit #1)", () => {
  it("routes a crisis note to the crisis surface and does NOT persist it", () => {
    const onCrisis = vi.fn();
    render(<EmaCheckIn onCrisis={onCrisis} />);
    driveToNote("kill myself");
    expect(onCrisis).toHaveBeenCalledOnce();
    expect(loadEmaEntries()).toHaveLength(0); // never stored
  });

  it("saves a benign note normally and never fires crisis", () => {
    const onCrisis = vi.fn();
    const onLogged = vi.fn();
    render(<EmaCheckIn onCrisis={onCrisis} onLogged={onLogged} />);
    driveToNote("tired today");
    expect(onCrisis).not.toHaveBeenCalled();
    expect(onLogged).toHaveBeenCalledOnce();
    const saved = loadEmaEntries();
    expect(saved).toHaveLength(1);
    expect(saved[0].note).toBe("tired today");
  });
});
