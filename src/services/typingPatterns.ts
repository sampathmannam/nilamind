import { secureLocal, appendToSecureArray } from "./secureLocal";

const TYPING_KEY = "nilamind_typing_sessions";

export type KeyClass = "backspace" | "space" | "enter" | "char";

export interface KeystrokeEvent {
  ts: number;
  // PRIVACY: a COARSE class only — the literal typed character is NEVER stored. Typing-pattern analysis
  // needs timing, not content; storing the character would be a keylog of everything typed into a
  // mental-health app (and plaintext in secureLocal passthrough mode).
  keyClass: KeyClass;
  type: "down" | "up";
  targetId: string;
}

/** Map a raw keyboard key to a coarse class so timing can be analysed without ever storing content. */
export function classifyKey(key: string): KeyClass {
  if (key === "Backspace" || key === "Delete") return "backspace";
  if (key === " " || key === "Spacebar" || key === "Space") return "space";
  if (key === "Enter") return "enter";
  return "char";
}

export interface TypingSession {
  id: string;
  startedAt: number;
  endedAt: number;
  targetId: string;
  events: KeystrokeEvent[];
  textLength: number;
}

export interface TypingMetrics {
  avgHoldTime: number;
  avgFlightTime: number;
  errorRate: number;
  typingSpeed: number;
  pauseCount: number;
  avgPauseDuration: number;
  burstCount: number;
  sessionDuration: number;
}

/** Record a keystroke event (called from input handlers). `event.keyClass` is a coarse class, never a
 * character. Capped so the timing buffer can't grow without bound. */
export function recordKeystroke(event: KeystrokeEvent): void {
  appendToSecureArray(TYPING_KEY + "_events", event, 1000);
}

/** Start a new typing session for a given target (e.g., "chat", "diary"). */
export function startTypingSession(targetId: string): string {
  const sessionId = "ts_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const session: TypingSession = {
    id: sessionId,
    startedAt: Date.now(),
    endedAt: 0,
    targetId,
    events: [],
    textLength: 0,
  };
  appendToSecureArray(TYPING_KEY, session);
  return sessionId;
}

/** End a typing session and compute metrics. */
export function endTypingSession(sessionId: string, finalTextLength: number): TypingMetrics | null {
  try {
    const raw = secureLocal.getItem(TYPING_KEY);
    if (!raw) return null;
    const sessions: TypingSession[] = JSON.parse(raw);
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return null;
    const session = sessions[idx];
    session.endedAt = Date.now();
    session.textLength = finalTextLength;
    sessions[idx] = session;
    secureLocal.setItem(TYPING_KEY, JSON.stringify(sessions));

    return computeMetrics(session);
  } catch {
    return null;
  }
}

/** Compute metrics from a completed session. */
export function computeMetrics(session: TypingSession): TypingMetrics {
  const { events } = session;
  if (events.length < 2) {
    return zeroMetrics();
  }

  const downs = events.filter((e) => e.type === "down");
  const ups = events.filter((e) => e.type === "up");

  let holdSum = 0, holdCount = 0;
  let flightSum = 0, flightCount = 0;
  let pauseSum = 0, pauseCount = 0;
  let burstCount = 0;
  let inBurst = false;
  let lastUpTime = 0;

  // FIFO pairing of down→up by order (no key identity needed → the raw character is never required).
  const downQueue: number[] = [];
  for (const e of events) {
    if (e.type === "down") {
      downQueue.push(e.ts);
    } else if (e.type === "up") {
      const downTime = downQueue.shift();
      if (downTime !== undefined) {
        holdSum += e.ts - downTime;
        holdCount++;
      }
      if (lastUpTime > 0) {
        const flight = e.ts - lastUpTime;
        flightSum += flight;
        flightCount++;
        if (flight > 500) {
          pauseSum += flight;
          pauseCount++;
          inBurst = false;
        } else if (!inBurst) {
          burstCount++;
          inBurst = true;
        }
      }
      lastUpTime = e.ts;
    }
  }

  const sessionDuration = session.endedAt - session.startedAt;
  const typingSpeed = session.textLength / (sessionDuration / 60000); // chars per minute

  return {
    avgHoldTime: holdCount ? holdSum / holdCount : 0,
    avgFlightTime: flightCount ? flightSum / flightCount : 0,
    errorRate: 0, // would need backspace/delete detection
    typingSpeed,
    pauseCount,
    avgPauseDuration: pauseCount ? pauseSum / pauseCount : 0,
    burstCount,
    sessionDuration,
  };
}

function zeroMetrics(): TypingMetrics {
  return { avgHoldTime: 0, avgFlightTime: 0, errorRate: 0, typingSpeed: 0, pauseCount: 0, avgPauseDuration: 0, burstCount: 0, sessionDuration: 0 };
}

/** Get recent metrics for a target (e.g., last 7 days). */
export function getRecentMetrics(targetId: string, days = 7): TypingMetrics[] {
  try {
    const raw = secureLocal.getItem(TYPING_KEY);
    if (!raw) return [];
    const sessions: TypingSession[] = JSON.parse(raw);
    const since = Date.now() - days * 86400000;
    return sessions
      .filter((s) => s.targetId === targetId && s.endedAt > since && s.events.length > 1)
      .map(computeMetrics);
  } catch {
    return [];
  }
}

/** Detect mood signal from typing patterns. Returns "mania" | "depression" | "anxiety" | null. */
export function detectMoodSignal(metrics: TypingMetrics): "mania" | "depression" | "anxiety" | null {
  if (metrics.sessionDuration < 10000) return null; // too short

  // Mania: very fast typing, short holds, few pauses, many bursts
  if (metrics.typingSpeed > 300 && metrics.avgHoldTime < 80 && metrics.pauseCount < 3 && metrics.burstCount > 5) {
    return "mania";
  }

  // Depression: slow typing, long holds, many long pauses
  if (metrics.typingSpeed < 80 && metrics.avgHoldTime > 150 && metrics.avgPauseDuration > 2000 && metrics.pauseCount > 5) {
    return "depression";
  }

  // Anxiety: high variability, many short pauses, moderate speed
  if (metrics.pauseCount > 8 && metrics.avgPauseDuration < 1000 && metrics.typingSpeed > 120 && metrics.typingSpeed < 250) {
    return "anxiety";
  }

  return null;
}

/** Clear old sessions (privacy: keep only last 30 days). */
export function pruneOldSessions(): void {
  try {
    const raw = secureLocal.getItem(TYPING_KEY);
    if (!raw) return;
    const sessions: TypingSession[] = JSON.parse(raw);
    const cutoff = Date.now() - 30 * 86400000;
    const kept = sessions.filter((s) => s.startedAt > cutoff);
    secureLocal.setItem(TYPING_KEY, JSON.stringify(kept));
  } catch { /* ignore */ }
}