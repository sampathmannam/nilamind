// Protocol chat helpers — thin wrappers over protocolProgress that turn protocol starts/advances into
// assistant-message shaped results. Pure, deterministic, §9-aware.

import { startProtocol, advanceProtocol, getActiveProgress, protocolOffer } from "./protocolProgress";
import { scanForCrisis } from "../safety";

export type ProtocolChatResult =
  | { kind: "started"; title: string; prompt: string }
  | { kind: "advanced"; title: string; prompt: string }
  | { kind: "done"; title: string }
  | { kind: "none" };

export interface ProtocolCard {
  protocolId: string;
  title: string;
  label: string;
  active: boolean;
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
  if ("done" in next) return { kind: "done", title: next.protocol.title };
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
    };
  }
  const offer = protocolOffer(userText);
  if (!offer) return null;
  return { protocolId: offer.id, title: offer.title, label: `Try ${offer.title} with me`, active: false };
}
