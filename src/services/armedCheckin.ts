import { secureLocal } from "./secureLocal";
import { getSessionChat } from "./sessionChat";

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
