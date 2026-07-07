// Voice pattern analysis — on-device, privacy-first proxy for vocal biomarkers.
// Acoustic features (pitch, formants) require native DSP, so we proxy through easily-captured
// session metadata: duration, word count, speaking rate. Research shows rate and pause patterns
// correlate with mood states (Hollien 1980; Cannizzaro et al. 2004 for depression; Stassen 1997
// for mania). This is a WELLNESS signal, never diagnostic.

import { secureLocal, appendToSecureArray } from "./secureLocal";

const KEY = "nilamind_voice_sessions";

export interface VoiceSession {
  id: string;
  startedAt: number;
  endedAt: number;
  wordCount: number;
  target: "chat" | "call";
}

export interface VoiceMetrics {
  durationSec: number;
  speakingRate: number; // words per minute
  wordCount: number;
}

export function startVoiceSession(target: "chat" | "call"): string {
  const id = "vs_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const session: VoiceSession = { id, startedAt: Date.now(), endedAt: 0, wordCount: 0, target };
  appendToSecureArray(KEY, session);
  return id;
}

export function endVoiceSession(sessionId: string, transcript: string): VoiceMetrics | null {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return null;
    const sessions: VoiceSession[] = JSON.parse(raw);
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx === -1) return null;
    const s = sessions[idx];
    s.endedAt = Date.now();
    s.wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    sessions[idx] = s;
    secureLocal.setItem(KEY, JSON.stringify(sessions));
    return computeVoiceMetrics(s);
  } catch {
    return null;
  }
}

export function computeVoiceMetrics(session: VoiceSession): VoiceMetrics {
  const durationSec = Math.max(1, (session.endedAt - session.startedAt) / 1000);
  const wpm = Math.round((session.wordCount / durationSec) * 60);
  return { durationSec: Math.round(durationSec * 10) / 10, speakingRate: wpm, wordCount: session.wordCount };
}

/** Detect mood signal from recent voice sessions. Returns null if not enough data. */
export function voiceMoodSignal(): "mania" | "depression" | "anxiety" | null {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return null;
    const sessions: VoiceSession[] = JSON.parse(raw);
    const recent = sessions.filter((s) => s.endedAt > 0 && Date.now() - s.endedAt < 7 * 86400000);
    if (recent.length < 2) return null;

    const metrics = recent.map(computeVoiceMetrics);
    const avgWpm = metrics.reduce((a, m) => a + m.speakingRate, 0) / metrics.length;
    const avgDuration = metrics.reduce((a, m) => a + m.durationSec, 0) / metrics.length;

    // Mania proxy: fast speech (>160 wpm) with short utterances (<3 sec avg)
    if (avgWpm > 160 && avgDuration < 3) return "mania";

    // Depression proxy: slow speech (<80 wpm) with longer pauses (longer duration per word)
    if (avgWpm < 80 || (avgWpm < 90 && metrics.every((m) => m.wordCount < 5))) return "depression";

    // Anxiety proxy: moderate-high rate with high variability in word count per session
    const wcStd = std(metrics.map((m) => m.wordCount));
    if (avgWpm > 100 && avgWpm < 160 && wcStd > 8) return "anxiety";

    return null;
  } catch {
    return null;
  }
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
}

/** Clear old sessions (privacy: keep only 30 days). */
export function pruneVoiceSessions(): void {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return;
    const sessions: VoiceSession[] = JSON.parse(raw);
    const cutoff = Date.now() - 30 * 86400000;
    secureLocal.setItem(KEY, JSON.stringify(sessions.filter((s) => s.startedAt > cutoff)));
  } catch { /* ignore */ }
}
