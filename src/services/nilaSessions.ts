// Nila session logging (AUTOPILOT Phase 2). Records a lightweight, on-device trail of the user's
// Nila interactions so the dashboard can show "recent Nila sessions". Stores ONLY a short snippet of
// the user's own message + a timestamp — never the AI reply, never anything that leaves the device.
// Encrypted at rest via secureLocal. Capped so it can't grow unbounded.

import { secureLocal } from "./secureLocal";

export interface NilaTurn {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // locale time
  surface: "coach" | "episode";
  snippet: string; // first ~80 chars of the user's message
}

const KEY = "nilamind_nila_sessions";
const CAP = 200;

export function loadNilaTurns(): NilaTurn[] {
  try {
    const raw = secureLocal.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as NilaTurn[]) : [];
  } catch {
    return [];
  }
}

export function logNilaTurn(surface: NilaTurn["surface"], userText: string): void {
  const now = new Date();
  const turn: NilaTurn = {
    id: "sg_" + Date.now(),
    date: now.toISOString().split("T")[0],
    timestamp: now.toLocaleTimeString(),
    surface,
    snippet: (userText || "").trim().slice(0, 80),
  };
  const all = loadNilaTurns();
  all.push(turn);
  // keep the most recent CAP turns
  const trimmed = all.length > CAP ? all.slice(all.length - CAP) : all;
  try {
    secureLocal.setItem(KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to log Nila turn:", e);
  }
}

export interface NilaStats {
  total: number;
  last7: number;
  recent: NilaTurn[]; // newest-first, up to 8
}

export function nilaStats(): NilaStats {
  const all = loadNilaTurns();
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  return {
    total: all.length,
    last7: all.filter((t) => t.date >= weekAgo).length,
    recent: [...all].reverse().slice(0, 8),
  };
}
