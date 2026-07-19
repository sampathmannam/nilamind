// Protocol chat helpers — thin wrappers over protocolProgress that turn protocol starts/advances into
// assistant-message shaped results. Pure, deterministic, §9-aware.

import { startProtocol, advanceProtocol, getActiveProgress, protocolOffer, completionCountFor } from "./protocolProgress";
import { getProtocol } from "./protocols";
import { scanForCrisis } from "../safety";

export type ProtocolChatResult =
  | { kind: "started"; title: string; prompt: string }
  | { kind: "advanced"; title: string; prompt: string }
  | { kind: "done"; title: string; id: string }
  | { kind: "none" };

export interface ProtocolCard {
  protocolId: string;
  title: string;
  label: string;
  active: boolean;
  /** The evidence citation for this protocol (Protocol.basis), shown as a small citation chip. */
  basis: string;
}

/** Start a protocol and return the first step as an assistant prompt. */
export function startProtocolChat(id: string): ProtocolChatResult {
  const active = startProtocol(id);
  if (!active) return { kind: "none" };
  return { kind: "started", title: active.protocol.title, prompt: active.step.prompt };
}

/** Advance the active protocol and return the next step, or done when complete. */
export function continueProtocolChat(): ProtocolChatResult {
  const active = getActiveProgress();
  if (!active) return { kind: "none" };
  const next = advanceProtocol();
  if (!next) return { kind: "none" };
  if ("done" in next) return { kind: "done", title: next.protocol.title, id: next.protocol.id };
  return { kind: "advanced", title: next.protocol.title, prompt: next.step.prompt };
}

/**
 * Build a protocol offer/continue card for the chat surface. Returns null when:
 *  - the text is a crisis disclosure (§9 gate),
 *  - a protocol is already active (show continue instead),
 *  - no protocol matches the user's words.
 */
export function protocolOfferCard(userText: string): ProtocolCard | null {
  if (scanForCrisis(userText)) return null;
  const active = getActiveProgress();
  if (active) {
    return {
      protocolId: active.protocol.id,
      title: active.protocol.title,
      label: `Continue ${active.protocol.title} — step ${active.stepIndex + 1} of ${active.total}`,
      active: true,
      basis: active.protocol.basis,
    };
  }
  const offer = protocolOffer(userText);
  if (!offer) return null;
  // 2026-07-12 Wave 3, Group H: restarting a completed protocol was never blocked (verified via a read of
  // protocolProgress.ts before this change — no gating state exists), so this is purely a visibility fix —
  // surface the completion count from the existing append-only log so a repeat isn't silently invisible.
  const priorCompletions = completionCountFor(offer.id);
  const label =
    priorCompletions > 0
      ? `Try ${offer.title} again — you've completed it ${priorCompletions} time${priorCompletions === 1 ? "" : "s"} before`
      : `Try ${offer.title} with me`;
  return { protocolId: offer.id, title: offer.title, label, active: false, basis: offer.basis };
}

/**
 * Offer a step-up program after completing one, when a deliberate stepped-care next step exists.
 * Today this is a single hardcoded edge (sleep-wind-down -> cbti-sleep, see the pinning comments in
 * protocols.ts and protocolCBTI.ts) rather than a generic graph — add edges here explicitly as more
 * are identified, don't build a generic "next protocol" inference system for one known case.
 */
export function stepUpOffer(completedProtocolId: string): ProtocolCard | null {
  if (completedProtocolId !== "sleep-wind-down") return null;
  const next = getProtocol("cbti-sleep");
  if (!next) return null;
  return {
    protocolId: next.id,
    title: next.title,
    label: `Ready for more? ${next.title} builds on what you just practiced, with a fuller program.`,
    active: false,
    basis: next.basis,
  };
}
