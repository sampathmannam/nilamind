// Recent-tool-use log for the "Recently used" (TodayScreen) and "Pinned" (ToolsScreen, by-frequency)
// sections added in the 2026-08 UI/UX redesign. Which coping tools a person opens is health-adjacent
// metadata (e.g. safety-plan, TIPP, chain-analysis), so — like every other persisted key in this app —
// it goes through secureLocal (encrypted), not raw localStorage.
import { secureLocal } from "./secureLocal";

const STORAGE_KEY = "nilamind_recent_tools";
const MAX_ENTRIES = 5;
const RECENT_DISPLAY = 3;

export interface RecentToolEntry {
  target: string;
  timestamp: number;
}

function safeGet(): RecentToolEntry[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSet(entries: RecentToolEntry[]): void {
  try {
    secureLocal.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // private mode / storage error — degrade silently, matches every other secureLocal write site
  }
}

// Hubs are doorways, not destinations. Recording a hub open made "Recently"/"Pinned" list the hub
// AND the child opened through it as sibling rows with the same icon (15-day longitudinal run,
// 2026-08-24: "Calm space" + "Breathing & Grounding", both wind icons, both "2d ago") — which reads
// as a duplicate. Only real destinations are worth a shortcut.
const HUB_IDS = new Set(["calm_hub", "skills_hub"]);

export function recordToolUse(target: string): void {
  if (HUB_IDS.has(target)) return;
  const entries = safeGet().filter((e) => e.target !== target);
  entries.unshift({ target, timestamp: Date.now() });
  safeSet(entries.slice(0, MAX_ENTRIES));
}

/** Most-recent-first, capped to 3 — used for TodayScreen's "Recently used" section. */
export function getRecentTools(): RecentToolEntry[] {
  return safeGet().slice(0, RECENT_DISPLAY);
}

/** All stored entries (up to MAX_ENTRIES), unsliced — used by ToolsScreen to rank "Pinned" tools by
 *  use-frequency rather than pure recency. */
export function getAllRecentTools(): RecentToolEntry[] {
  return safeGet();
}
