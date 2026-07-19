import { describe, it, expect } from "vitest";
import { navReducer, initialNavState, type NavState } from "./navStore";

// Regression (device QA, reproduced repeatedly including on v1.17.6, after the v1.17.2 navStore
// rewrite): closing an aux screen sometimes surfaced an EARLIER-visited screen instead of
// returning to the base tab. Root cause: OPEN_SHEET and OPEN_CRISIS pushed a new overlay without
// stripping any aux overlay that was mid-close (closing:true) — e.g. handlers that chain
// "close current aux" + "open new overlay" synchronously (App.tsx's onNavigateToGrounding /
// onCrisis) leave [{aux, closing:true}, {newOverlay}]. Closing the new overlay via CLOSE_TOP then
// pops only the last element, re-revealing the stale closing aux instead of an empty stack.
describe("navReducer — closing an aux overlay must not resurface after a chained open", () => {
  it("OPEN_SHEET strips a mid-close aux overlay instead of stacking on top of it", () => {
    let state: NavState = initialNavState;
    state = navReducer(state, { type: "OPEN_AUX", view: "episode" });
    state = navReducer(state, { type: "CLOSE_AUX_START" }); // marks the aux closing:true, doesn't remove it
    state = navReducer(state, { type: "OPEN_SHEET", id: "grounding" }); // chained open, same tick
    state = navReducer(state, { type: "CLOSE_TOP" }); // user closes the new overlay

    expect(state.overlays).toEqual([]);
  });

  it("OPEN_CRISIS strips a mid-close aux overlay instead of stacking on top of it", () => {
    let state: NavState = initialNavState;
    state = navReducer(state, { type: "OPEN_AUX", view: "episode" });
    state = navReducer(state, { type: "CLOSE_AUX_START" });
    state = navReducer(state, { type: "OPEN_CRISIS" });
    state = navReducer(state, { type: "CLOSE_TOP" });

    expect(state.overlays).toEqual([]);
  });

  it("CLOSE_TOP never leaves a mid-close aux overlay behind, even without a chained open", () => {
    let state: NavState = initialNavState;
    state = navReducer(state, { type: "OPEN_AUX", view: "episode" });
    state = navReducer(state, { type: "OPEN_SHEET", id: "grounding" });
    state = navReducer(state, { type: "CLOSE_AUX_START" }); // marks the UNDERLYING aux closing, not the top sheet
    state = navReducer(state, { type: "CLOSE_TOP" }); // pops the sheet (last element)

    expect(state.overlays).toEqual([]);
  });
});

// Phase 3: ModeScreen capture sheets are now overlays in the single stack (was a signal bridge).
describe("navReducer — capture sheets in the overlay stack", () => {
  it("OPEN_CAPTURE pushes a capture overlay; CLOSE_TOP removes it", () => {
    let state: NavState = initialNavState;
    state = navReducer(state, { type: "OPEN_CAPTURE", id: "thought_record" });
    expect(state.overlays).toEqual([{ kind: "capture", id: "thought_record" }]);
    state = navReducer(state, { type: "CLOSE_TOP" });
    expect(state.overlays).toEqual([]);
  });

  it("only ONE capture at a time — a second OPEN_CAPTURE replaces the first", () => {
    let state: NavState = initialNavState;
    state = navReducer(state, { type: "OPEN_CAPTURE", id: "thought_record" });
    state = navReducer(state, { type: "OPEN_CAPTURE", id: "safety_plan" });
    expect(state.overlays).toEqual([{ kind: "capture", id: "safety_plan" }]);
  });

  it("§9 ORDERING: a crisis opened over a capture sheet is on TOP — back closes crisis first, sheet survives", () => {
    let state: NavState = initialNavState;
    state = navReducer(state, { type: "OPEN_CAPTURE", id: "safety_plan" });
    state = navReducer(state, { type: "OPEN_CRISIS" });
    // crisis is the top overlay
    expect(state.overlays[state.overlays.length - 1]).toEqual({ kind: "crisis" });
    // first BACK (CLOSE_TOP) removes the crisis, leaving the capture sheet intact
    state = navReducer(state, { type: "CLOSE_TOP" });
    expect(state.overlays).toEqual([{ kind: "capture", id: "safety_plan" }]);
    // second BACK removes the capture sheet
    state = navReducer(state, { type: "CLOSE_TOP" });
    expect(state.overlays).toEqual([]);
  });

  it("OPEN_SHEET/OPEN_CRISIS still strip a mid-close aux even with a capture present", () => {
    let state: NavState = initialNavState;
    state = navReducer(state, { type: "OPEN_CAPTURE", id: "learn" });
    state = navReducer(state, { type: "OPEN_AUX", view: "episode" });
    state = navReducer(state, { type: "CLOSE_AUX_START" });
    state = navReducer(state, { type: "OPEN_CRISIS" });
    state = navReducer(state, { type: "CLOSE_TOP" }); // close crisis
    // the mid-close aux is gone; the capture remains as the base overlay
    expect(state.overlays).toEqual([{ kind: "capture", id: "learn" }]);
  });
});
