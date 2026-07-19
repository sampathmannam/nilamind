import { useState, useEffect, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import { getSessionChat, setSessionChat, clearSessionChat } from "../services/sessionChat";
import { suppressNudgesForCrisis } from "../services/notifications";
import type { NilaUiMessage } from "../services/nilaSend";

// useCrisisGate — the §9 crisis + chat-persistence seam, extracted from ModeScreen (Phase 4 slice 4a).
// openCrisis() has ~10 callers across the screen (chat send guard, the 4 draft openers, quick actions, the
// header button, the face long-press), so it is NOT chat-specific — it lives here, and everything that opens
// a crisis calls gate.openCrisis. Colocating openCrisis with the persist/restore effects puts the entire
// "never persist a §9 crisis turn" invariant in one directly-unit-testable file.
//
// OWNERSHIP: hadCrisisRef + crisisPendingRef are declared in ModeScreen and passed in (logical ownership,
// not lexical) — useNudges reads hadCrisisRef and is created first, and handleSendMessage mutates
// crisisPendingRef. There must be exactly ONE of each ref object; this hook only receives them. `messages`
// stays owned by ModeScreen (it is read by useNudges, the selector, the protocol handlers, and the render —
// moving it here would be a cycle); the persist effect receives it.

export interface UseCrisisGateArgs {
  hadCrisisRef: MutableRefObject<boolean>;
  crisisPendingRef: MutableRefObject<boolean>;
  messages: NilaUiMessage[];
  setMessages: Dispatch<SetStateAction<NilaUiMessage[]>>;
  onOpenCrisis?: () => void;
  /** nudges.clearForCrisis — §9 precedence over ambient nudges (pact/welcome/calm). */
  clearNudges: () => void;
  /** () => setProtocolCard(null) — protocolCard stays owned by ModeScreen. */
  clearProtocol: () => void;
}

export function useCrisisGate({
  hadCrisisRef,
  crisisPendingRef,
  messages,
  setMessages,
  onOpenCrisis,
  clearNudges,
  clearProtocol,
}: UseCrisisGateArgs) {
  const [softCrisisCard, setSoftCrisisCard] = useState(false); // 2026-07-12 Wave 3: soft tier, classifier-only hits

  // openCrisis(detected, tier): `detected` = the model/gate FLAGGED a §9 crisis in the user's turn. Only then
  // do we latch "never persist" + wipe the transcript + clear self-help cards (§9 precedence) — UNCONDITIONAL
  // on `detected`, NOT gated by tier, so a soft-tier hit gets the identical protection as a full-tier hit.
  // A PROACTIVE open (the user tapping crisis resources) must NOT wipe their in-progress conversation
  // (#6 re-audit) nor offer nothing.
  //
  // `tier` (2026-07-12 Wave 3, two-tier crisis surface; RETIERED 2026-07-12 Bug 1 fix — adversarial review
  // found the original branch used `source === "classifier"`, which wrongly treated EVERY classifier-only
  // hit as low-confidence, including genuine high-confidence disclosures the keyword floor structurally
  // cannot see — e.g. "everyone would be better off without me" scores 0.8837. `tier` is the field that
  // actually reflects confidence — see crisisClassifier.ts's CrisisTier docs): tier === "soft" renders the
  // SOFT inline SoftCrisisCard instead of the full-screen CrisisOverlay. A null/unspecified tier (proactive
  // taps, the arm-request branch, ambiguous/fail-closed cases), tier === "full", and every other existing call
  // site all fall through unchanged to onOpenCrisis?.() — bit-for-bit the same full takeover as today. Only
  // the RENDERING SURFACE differs by tier; every other invariant above stays unconditional.
  const openCrisis = (detected = false, tier: "full" | "soft" | null = null) => {
    if (detected) {
      hadCrisisRef.current = true;
      clearSessionChat();      // the flagged crisis turn must never persist/restore
      clearProtocol();
      void suppressNudgesForCrisis(); // P6.4: latch no-nudge + yank queued pings, same as App.tsx's activateCrisis
    }
    clearNudges(); // §9 takes precedence: clears pact + welcome-back + calm-moment safety-plan nudge (Task 1.5)
    if (detected && tier === "soft") {
      setSoftCrisisCard(true); // soft tier — inline card, no full takeover
      return;
    }
    // Bug 2 fix (2026-07-12, adversarial review): the full-takeover branch must unconditionally clear any
    // STALE soft card from an earlier turn. Repro without this: soft card shows for message A → message B is
    // a full-tier hit before the card is dismissed → CrisisOverlay opens on top of it → user dismisses the
    // overlay → the stale card reappears underneath, re-asking "Can I pause here?" right after the user just
    // went through the full safety-plan flow.
    setSoftCrisisCard(false);
    onOpenCrisis?.();
  };

  // audit 2.1 — CHAT PERSISTENCE. Restore an in-progress conversation on mount so it survives leaving/killing
  // the app; a crisis session is intentionally never restored (it is cleared by the persist effect below).
  // Note: the greeting is seeded in ModeScreen's initial `messages` — if getSessionChat() is empty, the
  // greeting stays and this effect does nothing.
  useEffect(() => {
    const saved = getSessionChat();
    if (saved.length) setMessages(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist the chat as it grows. INVARIANT: a §9 crisis turn is NEVER persisted — clear the store so a
  // crisis transcript can't be restored later (mirrors the old AiCoachScreen rule). asyncReflection and
  // armedCheckin read getSessionChat(), so this is also what makes those features see real conversations.
  useEffect(() => {
    // #4 (audit): once a session has EVER tripped §9, never persist it. The old code keyed the clear on the
    // transient showCrisis boolean, so the crisis transcript was re-written the instant the overlay closed.
    if (hadCrisisRef.current) { clearSessionChat(); return; }
    // #5-out (2026-07-10 re-audit): a just-sent turn whose §9 verdict is still pending (the classifier runs an
    // async MiniLM pass) must NOT be written yet — otherwise a euphemistic crisis the keyword floor misses is
    // persisted during the embedder window, and a kill there leaves it durable + restored next launch.
    if (crisisPendingRef.current) return;
    if (messages.length) setSessionChat(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  return { softCrisisCard, setSoftCrisisCard, openCrisis };
}
