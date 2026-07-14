// Protocol-Guided Conversations — structured, evidence-based conversation flows.
// Research: Woebot uses structured CBT flows; Wysa uses guided DBT/ACT protocols.
// Nila's small model generates natural language within deterministic steps — the protocol
// handles therapeutic direction, the model handles warmth and empathy.

export type ProtocolState = "inactive" | "active" | "completed" | "abandoned";

export interface ConversationStep {
  id: string;
  /** System prompt override for this step (merged with base persona). */
  prompt: string;
  /** What Nila says at this step (template — {vars} filled by model or engine). */
  nilaTemplate: string;
  /** What the model fills in (e.g., "empathy", "question", "reflection"). */
  modelFill: string;
  /** How to determine the next step based on user response. */
  next: (userResponse: string) => "advance" | "repeat" | "exit";
}

export interface ConversationProtocol {
  id: string;
  name: string;
  /** When to trigger this protocol. */
  trigger: string; // description of when to activate
  steps: ConversationStep[];
  /** What Nila says when the protocol completes. */
  completionMessage: string;
}

export interface ActiveProtocol {
  protocolId: string;
  currentStepIndex: number;
  startedAt: number;
}

/** In-memory protocol state — per session, not persisted. */
let activeProtocol: ActiveProtocol | null = null;

export function getActiveProtocol(): ActiveProtocol | null {
  return activeProtocol;
}

export function isProtocolActive(): boolean {
  return activeProtocol !== null;
}

export function startProtocol(protocolId: string): void {
  activeProtocol = { protocolId, currentStepIndex: 0, startedAt: Date.now() };
}

export function getCurrentStep(protocols: Record<string, ConversationProtocol>): ConversationStep | null {
  if (!activeProtocol) return null;
  const proto = protocols[activeProtocol.protocolId];
  if (!proto || activeProtocol.currentStepIndex >= proto.steps.length) return null;
  return proto.steps[activeProtocol.currentStepIndex];
}

export function advanceProtocol(): void {
  if (!activeProtocol) return;
  activeProtocol.currentStepIndex++;
}

export function repeatStep(): void {
  // stay on current step — no action needed
}

export function completeProtocol(): string {
  const protoId = activeProtocol?.protocolId ?? "";
  activeProtocol = null;
  return protoId;
}

export function abandonProtocol(): void {
  activeProtocol = null;
}
