import { secureLocal } from "./secureLocal";

const PEER_KEY = "nilamind_peer_support";

export interface PeerProfile {
  id: string;
  createdAt: string;
  stage: string;
  goals: string[];
  style: string;
  availability: string;
}

export interface PeerSession {
  id: string;
  date: string;
  contactName: string;
  moodBefore: number;
  moodAfter: number | null;
  connected: boolean;
  notes: string;
}

const PROFILES: PeerProfile[] = []; // empty until user creates one

export function createProfile(stage: string, goals: string[], style: string, availability: string): PeerProfile {
  return {
    id: "pp_" + Date.now(),
    createdAt: new Date().toISOString(),
    stage,
    goals,
    style,
    availability,
  };
}

export function loadProfile(): PeerProfile | null {
  try {
    const raw = secureLocal.getItem(PEER_KEY + "_profile");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: PeerProfile): void {
  secureLocal.setItem(PEER_KEY + "_profile", JSON.stringify(p));
}

export function loadSessions(): PeerSession[] {
  try {
    const raw = secureLocal.getItem(PEER_KEY + "_sessions");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(s: PeerSession): void {
  const sessions = loadSessions();
  sessions.push(s);
  secureLocal.setItem(PEER_KEY + "_sessions", JSON.stringify(sessions));
}

export function prewrittenTemplates(): { id: string; label: string; text: string }[] {
  return [
    { id: "hard_time", label: "I'm having a hard time", text: "Hey — I'm having a hard time right now and could use someone to talk to. Are you free for a few minutes?" },
    { id: "check_in", label: "Just checking in", text: "Hey — just checking in on you. How are things today?" },
    { id: "gratitude", label: "Thinking of you", text: "I was just thinking about you and wanted to say I appreciate you being in my life." },
    { id: "update", label: "Quick update", text: "Quick update from my end — things have been [up/down/about the same]. How about you?" },
  ];
}

export function sessionStreak(sessions: PeerSession[]): number {
  let streak = 0;
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].connected) streak++;
    else break;
  }
  return streak;
}

export function averageMoodImprovement(sessions: PeerSession[]): number | null {
  const complete = sessions.filter((s) => s.connected && s.moodAfter !== null);
  if (complete.length === 0) return null;
  const diff = complete.map((s) => (s.moodAfter ?? s.moodBefore) - s.moodBefore);
  return Math.round((diff.reduce((a, b) => a + b, 0) / complete.length) * 10) / 10;
}
