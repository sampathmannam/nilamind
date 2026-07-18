// Phase 20.3 — Patient pre-visit note (text + voice) for the clinician PDF.
// The user's literal request: "I couldn't recollect … I don't want to remember
// those and tell them again." A 2-minute typing-or-voice affordance before the
// PDF generates. Stored keyed by date. Last 4 notes kept (rolling window).

import { secureLocal } from "./secureLocal";
import { localDateKey } from "./storageUtils";

const STORAGE_KEY = "nilamind_visit_notes";
const MAX_NOTES = 4;

export interface VisitNotePrompt {
  prompt: string;
  answer: string;
}

export interface VisitNote {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string;
  text: string;
  voiceTranscript?: string;
  prompts: VisitNotePrompt[];
}

/** Save a new pre-visit note. Appends to the rolling window (max 4). */
export function saveVisitNote(
  text: string,
  prompts: VisitNotePrompt[] = [],
  voiceTranscript?: string,
): VisitNote {
  const now = new Date();
  const note: VisitNote = {
    id: "vn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    date: localDateKey(now),
    timestamp: now.toISOString(),
    text,
    ...(voiceTranscript ? { voiceTranscript } : {}),
    prompts,
  };

  const notes = loadAll();
  notes.push(note);
  // Keep only the most recent MAX_NOTES.
  if (notes.length > MAX_NOTES) {
    notes.splice(0, notes.length - MAX_NOTES);
  }
  secureLocal.setItem(STORAGE_KEY, JSON.stringify(notes));
  return note;
}

/** Load a single note by id. Returns null if not found. */
export function loadVisitNote(id: string): VisitNote | null {
  return loadAll().find((n) => n.id === id) ?? null;
}

/** Load recent notes sorted by timestamp descending (most recent first), capped at MAX_NOTES. */
export function loadRecentVisitNotes(): VisitNote[] {
  return loadAll()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, MAX_NOTES);
}

/** Delete a note by id. */
export function deleteVisitNote(id: string): void {
  const notes = loadAll().filter((n) => n.id !== id);
  secureLocal.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function loadAll(): VisitNote[] {
  try {
    const raw = secureLocal.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
