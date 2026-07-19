import React, { createContext, useContext, useReducer, useCallback, useMemo } from "react";
import { type AuxView, resolveNavTarget } from "./nav";
import { suppressNudgesForCrisis } from "./notifications";

export type AppTab = "nila" | "today" | "tools" | "you";

export type SheetId =
  | "settings"
  | "dashboard"
  | "medication"
  | "caregiver"
  | "legal"
  | "grounding"
  | "breathing";

// The ModeScreen capture sheets (learn / thought-record / problem-solving / values / safety-plan). Their
// §9-gated DRAFTS stay local to ModeScreen (computed from the chat); only their PRESENCE lives in the stack,
// so the hardware-back handler closes them generically (closeTop) instead of the old modeScreenHasSheet
// signal bridge — which could go stale-true when ModeScreen unmounted with a sheet open (Phase 3).
export type CaptureSheetId =
  | "learn"
  | "thought_record"
  | "problem_solving"
  | "values_to_action"
  | "safety_plan";

export type Overlay =
  | { kind: "crisis" }
  | { kind: "sheet"; id: SheetId }
  | { kind: "aux"; view: AuxView; closing: boolean }
  | { kind: "capture"; id: CaptureSheetId };

export interface NavState {
  tab: AppTab;
  overlays: Overlay[];
}

export type NavAction =
  | { type: "SET_TAB"; tab: AppTab }
  | { type: "OPEN_AUX"; view: AuxView }
  | { type: "OPEN_SHEET"; id: SheetId }
  | { type: "OPEN_CAPTURE"; id: CaptureSheetId }
  | { type: "OPEN_CRISIS" }
  | { type: "CLOSE_AUX_START" }
  | { type: "CLOSE_AUX_DONE" }
  | { type: "CLOSE_TOP" }
  | { type: "CLOSE_ALL" };

export const initialNavState: NavState = { tab: "today", overlays: [] };

// A mid-close aux overlay (closing:true, pending its ~200ms slide-out before CLOSE_AUX_DONE
// removes it) must never survive something new opening on top of it — otherwise a chained
// "close current aux, open new overlay" (e.g. App.tsx's onNavigateToGrounding/onCrisis) leaves
// [{aux, closing:true}, {newOverlay}], and closing the new overlay later re-reveals the stale aux
// instead of returning to the base tab.
const dropClosingAux = (overlays: Overlay[]): Overlay[] =>
  overlays.filter((o) => !(o.kind === "aux" && o.closing));

export function navReducer(state: NavState, action: NavAction): NavState {
  switch (action.type) {
    case "SET_TAB":
      return { ...state, tab: action.tab };
    case "OPEN_AUX": {
      const overlays = state.overlays.filter((o) => o.kind !== "aux");
      return { ...state, overlays: [...overlays, { kind: "aux", view: action.view, closing: false }] };
    }
    case "OPEN_SHEET": {
      const overlays = dropClosingAux(state.overlays).filter((o) => !(o.kind === "sheet" && o.id === action.id));
      return { ...state, overlays: [...overlays, { kind: "sheet", id: action.id }] };
    }
    case "OPEN_CAPTURE": {
      // One capture sheet at a time (like OPEN_AUX): drop any existing capture, then push the new one.
      const overlays = dropClosingAux(state.overlays).filter((o) => o.kind !== "capture");
      return { ...state, overlays: [...overlays, { kind: "capture", id: action.id }] };
    }
    case "OPEN_CRISIS":
      return { ...state, overlays: [...dropClosingAux(state.overlays), { kind: "crisis" }] };
    case "CLOSE_AUX_START": {
      const overlays = state.overlays.slice();
      for (let i = overlays.length - 1; i >= 0; i--) {
        const o = overlays[i];
        if (o.kind === "aux") {
          overlays[i] = { ...o, closing: true };
          break;
        }
      }
      return { ...state, overlays };
    }
    case "CLOSE_AUX_DONE":
      return { ...state, overlays: state.overlays.filter((o) => !(o.kind === "aux" && o.closing)) };
    case "CLOSE_TOP":
      return { ...state, overlays: dropClosingAux(state.overlays.slice(0, -1)) };
    case "CLOSE_ALL":
      return { ...state, overlays: [] };
    default:
      return state;
  }
}

export interface NavApi {
  state: NavState;
  go: (target: string) => void;
  setTab: (tab: AppTab) => void;
  openAux: (view: AuxView) => void;
  openSheet: (id: SheetId) => void;
  openCapture: (id: CaptureSheetId) => void;
  openCrisis: () => void;
  closeAuxStart: () => void;
  closeAuxDone: () => void;
  closeTop: () => void;
  closeAll: () => void;
}

const NavContext = createContext<NavApi | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(navReducer, initialNavState);

  const go = useCallback((target: string) => {
    const res = resolveNavTarget(target);
    switch (res.kind) {
      case "crisis":
        void suppressNudgesForCrisis();
        dispatch({ type: "OPEN_CRISIS" });
        break;
      case "plan":
        dispatch({ type: "OPEN_SHEET", id: "grounding" });
        break;
      case "tab":
        if (res.tab === "plan") dispatch({ type: "OPEN_SHEET", id: "grounding" });
        else if (res.tab === "nila" || res.tab === "today" || res.tab === "you")
          dispatch({ type: "SET_TAB", tab: res.tab });
        else if (res.tab === "diary") dispatch({ type: "OPEN_AUX", view: "diary" });
        break;
      case "aux":
        if (res.view === "settings") dispatch({ type: "OPEN_SHEET", id: "settings" });
        else if (res.view === "dashboard") dispatch({ type: "OPEN_SHEET", id: "dashboard" });
        else if (res.view === "medication") dispatch({ type: "OPEN_SHEET", id: "medication" });
        else if (res.view === "caregiver") dispatch({ type: "OPEN_SHEET", id: "caregiver" });
        else if (res.view === "legal") dispatch({ type: "OPEN_SHEET", id: "legal" });
        else dispatch({ type: "OPEN_AUX", view: res.view });
        break;
      case "unknown":
        if (res.target === "caregiver") dispatch({ type: "OPEN_SHEET", id: "caregiver" });
        else if (res.target === "grounding") dispatch({ type: "OPEN_SHEET", id: "grounding" });
        else if (res.target === "breathing") dispatch({ type: "OPEN_SHEET", id: "breathing" });
        break;
    }
  }, []);

  const setTab = useCallback((tab: AppTab) => dispatch({ type: "SET_TAB", tab }), []);
  const openAux = useCallback((view: AuxView) => dispatch({ type: "OPEN_AUX", view }), []);
  const openSheet = useCallback((id: SheetId) => dispatch({ type: "OPEN_SHEET", id }), []);
  const openCapture = useCallback((id: CaptureSheetId) => dispatch({ type: "OPEN_CAPTURE", id }), []);
  const openCrisis = useCallback(() => dispatch({ type: "OPEN_CRISIS" }), []);
  const closeAuxStart = useCallback(() => dispatch({ type: "CLOSE_AUX_START" }), []);
  const closeAuxDone = useCallback(() => dispatch({ type: "CLOSE_AUX_DONE" }), []);
  const closeTop = useCallback(() => dispatch({ type: "CLOSE_TOP" }), []);
  const closeAll = useCallback(() => dispatch({ type: "CLOSE_ALL" }), []);

  const api = useMemo<NavApi>(
    () => ({ state, go, setTab, openAux, openSheet, openCapture, openCrisis, closeAuxStart, closeAuxDone, closeTop, closeAll }),
    [state, go, setTab, openAux, openSheet, openCapture, openCrisis, closeAuxStart, closeAuxDone, closeTop, closeAll]
  );

  return <NavContext.Provider value={api}>{children}</NavContext.Provider>;
}

export function useNav(): NavApi {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within a NavProvider");
  return ctx;
}

export function topOverlay(state: NavState): Overlay | undefined {
  return state.overlays[state.overlays.length - 1];
}

export function hasOverlay(state: NavState, pred: (o: Overlay) => boolean): boolean {
  return state.overlays.some(pred);
}
