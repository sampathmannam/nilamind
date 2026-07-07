import { secureLocal } from "./secureLocal";
import { getSessionChat } from "./sessionChat";
import { scanForCrisis } from "../safety";
import { detectElevationRisk } from "./elevationGuard";
import type { NilaUiMessage } from "./nilaSend";

const ARMED_KEY = "nilamind_armed_checkin";

export interface ArmedCheckin {
  armedAt: number;
  triggerAt: number;
  context: string;
  userMessage: string;
  fired: boolean;
}

export function armCheckin(userMessage: string): ArmedCheckin {
  const now = Date.now();
  const triggerDate = new Date();

  if (/\btonight\b/.test(userMessage)) {
    triggerDate.setHours(20, 0, 0, 0);
  } else if (/\bmorning\b/.test(userMessage)) {
    triggerDate.setHours(8, 0, 0, 0);
    if (triggerDate.getTime() <= now) triggerDate.setDate(triggerDate.getDate() + 1);
  } else {
    // default: tonight at 8pm
    triggerDate.setHours(20, 0, 0, 0);
  }

  // Capture last user message as context
  const chat = getSessionChat();
  const userMsgs = chat.filter((m) => m.role === "user");
  const lastUserMsg = userMsgs.length > 0 ? userMsgs[userMsgs.length - 1].content.slice(0, 120) : "";

  const entry: ArmedCheckin = {
    armedAt: now,
    triggerAt: triggerDate.getTime(),
    context: lastUserMsg,
    userMessage,
    fired: false,
  };

  secureLocal.setItem(ARMED_KEY, JSON.stringify(entry));
  return entry;
}

export function getArmedCheckin(): ArmedCheckin | null {
  try {
    const raw = secureLocal.getItem(ARMED_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as ArmedCheckin;
    if (entry.fired) return null;
    if (Date.now() > entry.triggerAt + 43_200_000) return null; // expired >12h past trigger
    return entry;
  } catch {
    return null;
  }
}

export function armedCheckinBody(): string {
  return "You asked me to check in with you. How are things right now?";
}

export function armedCheckinPrompt(entry: ArmedCheckin): string {
  if (entry.context) {
    return `Hey — you asked me to check in on you. Earlier you mentioned: "${entry.context}". How did that go, and how are you feeling now?`;
  }
  return "Hey — you asked me to check in on you. How are things right now?";
}

export function markCheckinFired(): void {
  const entry = getArmedCheckin();
  if (entry) {
    entry.fired = true;
    secureLocal.setItem(ARMED_KEY, JSON.stringify(entry));
  }
}

const ARM_REQUEST_RE = /\bcheck\s*(?:in|on)\s*(?:me|with\s*me)|nudge\s*me|remind\s*me\s+later\b/i;
const QUIET_RE = /\b(?:quiet|do\s*not\s*disturb|dnd|leave\s*me\s*alone|stop\s*checking)\b/i;

export type ArmRequestResult =
  | { ok: true; entry: ArmedCheckin; triggerLabel: string }
  | { ok: false; reason: "not-requested" | "crisis" | "elevation" | "quiet" | "frequency" };

/** True when the user is explicitly asking to be checked-in on later (opt-in). */
export function looksLikeArmRequest(text: string): boolean {
  return ARM_REQUEST_RE.test(text);
}

function formatTrigger(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const time = `${hour12}:${m}${ampm}`;
  if (h === 8) return `tomorrow morning at ${time}`;
  if (h === 20) return `tonight at ${time}`;
  return `at ${time}`;
}

/**
 * Gate an armed check-in request. §9 + elevation + quiet + frequency-capped. Only arms when the user
 * explicitly opts in and all safety gates pass. Returns the armed entry and a friendly trigger label.
 */
export function requestArmedCheckin(
  userMessage: string,
  _chat?: NilaUiMessage[],
): ArmRequestResult {
  if (!looksLikeArmRequest(userMessage)) return { ok: false, reason: "not-requested" };
  if (scanForCrisis(userMessage)) return { ok: false, reason: "crisis" };
  if (detectElevationRisk(userMessage).level !== "none") return { ok: false, reason: "elevation" };
  if (QUIET_RE.test(userMessage.toLowerCase())) return { ok: false, reason: "quiet" };

  const existing = getArmedCheckin();
  if (existing && Date.now() - existing.armedAt < 24 * 60 * 60 * 1000) {
    return { ok: false, reason: "frequency" };
  }

  const entry = armCheckin(userMessage);
  return { ok: true, entry, triggerLabel: formatTrigger(entry.triggerAt) };
}
