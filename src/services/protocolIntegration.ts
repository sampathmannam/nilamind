// Protocol Integration — detects when to trigger protocols and provides system prompt overrides.
// Wired into buildNilaSystem in nila.ts — when a protocol is active, its step prompt overrides
// the default persona's guidance for that turn.

import {
  isProtocolActive,
  getCurrentStep,
  advanceProtocol,
  completeProtocol,
  startProtocol,
  getActiveProtocol,
} from "./conversationProtocols";
import { PROTOCOLS } from "./protocolDefinitions";
import type { ConversationProtocol } from "./conversationProtocols";

/**
 * Check if the user's message should trigger a protocol.
 * Returns the protocol to start, or null if no protocol triggered.
 */
export function detectProtocolTrigger(userMessage: string): ConversationProtocol | null {
  const lower = userMessage.toLowerCase();

  // Grounding: anxiety/panic/overwhelm markers
  if (
    lower.includes("anxious") || lower.includes("panic") || lower.includes("overwhelm") ||
    lower.includes("freaking out") || lower.includes("can't calm") || lower.includes("racing") ||
    lower.includes("panicking") || lower.includes("anxiety attack")
  ) {
    return PROTOCOLS.grounding;
  }

  // Mood check-in: exploring feelings or emotional confusion
  if (
    (lower.includes("feel") && (lower.includes("weird") || lower.includes("off") || lower.includes("numb"))) ||
    lower.includes("don't know how i feel") || lower.includes("confused about") ||
    lower.includes("what's wrong with me")
  ) {
    return PROTOCOLS.moodCheckIn;
  }

  // Sleep wind-down: evening + sleep concern
  if (
    lower.includes("can't sleep") || lower.includes("trouble sleeping") ||
    lower.includes("insomnia") || lower.includes("can't fall asleep") ||
    lower.includes("winding down") || lower.includes("help me sleep")
  ) {
    return PROTOCOLS.windDown;
  }

  // Strengths: hopelessness, worthlessness, stuck
  if (
    lower.includes("hopeless") || lower.includes("worthless") ||
    lower.includes("can't do anything right") || lower.includes("nothing helps") ||
    lower.includes("stuck") || lower.includes("no point")
  ) {
    return PROTOCOLS.strengths;
  }

  // Connection: loneliness, isolation
  if (
    lower.includes("lonely") || lower.includes("alone") ||
    lower.includes("no one to talk to") || lower.includes("isolated") ||
    lower.includes("nobody understands") || lower.includes("disconnected")
  ) {
    return PROTOCOLS.connection;
  }

  return null;
}

/**
 * Process the user's response to advance/repeat/exit the active protocol.
 * Returns: { action, completionMessage? }
 */
export function processProtocolResponse(userMessage: string): {
  action: "advance" | "repeat" | "exit";
  completionMessage?: string;
} {
  if (!isProtocolActive()) return { action: "advance" };

  const step = getCurrentStep(PROTOCOLS);
  if (!step) return { action: "exit" };

  const next = step.next(userMessage);

  if (next === "exit") {
    const protoId = completeProtocol();
    const proto = PROTOCOLS[protoId];
    return { action: "exit", completionMessage: proto?.completionMessage };
  }

  if (next === "advance") {
    advanceProtocol();
    // Check if we've completed all steps
    const nextStep = getCurrentStep(PROTOCOLS);
    if (!nextStep) {
      const protoId = completeProtocol();
      const proto = PROTOCOLS[protoId];
      return { action: "exit", completionMessage: proto?.completionMessage };
    }
    return { action: "advance" };
  }

  return { action: "repeat" };
}

/**
 * Get the protocol-aware system prompt override for the current step.
 * Returns null if no protocol is active.
 */
export function getProtocolSystemPrompt(): string | null {
  if (!isProtocolActive()) return null;

  const step = getCurrentStep(PROTOCOLS);
  if (!step) return null;

  return `CURRENT MODE: Following a structured "${getActiveProtocolName()}" protocol. ${step.prompt} RESPONSE FORMAT: ${step.nilaTemplate} [Fill in: ${step.modelFill}] Keep your response to this step only. Do NOT advance to the next step — let the person respond first.`;
}

function getActiveProtocolName(): string {
  const active = getActiveProtocol();
  if (!active) return "unknown";
  const proto = PROTOCOLS[active.protocolId];
  return proto?.name ?? "unknown";
}

/**
 * Check and potentially start a protocol for this message.
 * Returns a protocol-aware system prompt if one was started.
 */
export function checkAndStartProtocol(userMessage: string): string | null {
  if (isProtocolActive()) {
    // Already in a protocol — process the response
    const result = processProtocolResponse(userMessage);
    if (result.action === "exit") {
      // Protocol completed — let the default persona handle the completion
      return null;
    }
    // Protocol continues — return current step prompt
    return getProtocolSystemPrompt();
  }

  // No active protocol — check if we should start one
  const trigger = detectProtocolTrigger(userMessage);
  if (trigger) {
    startProtocol(trigger.id);
    return getProtocolSystemPrompt();
  }

  return null;
}
