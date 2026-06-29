// Nila's cross-session memory — the "remembers prior conversations" piece (Ash's hallmark, and the
// thing that turns a chatbot into someone who knows you over time).
//
// PRIVACY: at the END of a session Nila's ON-DEVICE model writes ONE short, high-level note of what the
// person talked about and how they seemed, stored ENCRYPTED on this device. Nothing leaves the phone —
// the summariser runs locally (generateOnDevice), so there is no network exposure at all; the note is
// high-level (no verbatim detail), capped, and is erased with the rest of their data. Best-effort and
// fire-and-forget — it never blocks or interrupts the user.

import { generateOnDevice } from "./localLlm";
import { secureLocal } from "./secureLocal";
import type { NilaMessage } from "./nila";

const KEY = "nilamind_nila_memory";
const CAP = 8;
const MIN_USER_TURNS = 3; // don't bother remembering a one-line hello

export interface SessionMemory {
  date: string; // YYYY-MM-DD
  note: string; // one warm, third-person sentence
}

export function loadNilaMemories(): SessionMemory[] {
  try {
    const raw = secureLocal.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function remember(note: string): void {
  const clean = (note || "").trim();
  if (!clean) return;
  const all = loadNilaMemories();
  all.push({ date: new Date().toISOString().split("T")[0], note: clean });
  const trimmed = all.length > CAP ? all.slice(all.length - CAP) : all;
  try {
    secureLocal.setItem(KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save Nila memory:", e);
  }
}

/** Recent memory notes formatted for the personal-context briefing (oldest→newest), or "". */
export function recentMemoryLines(n = 3): string {
  const recent = loadNilaMemories().slice(-n);
  if (!recent.length) return "";
  return recent.map((m) => `- ${m.note}`).join("\n");
}

const SUMMARIZER =
  "You quietly keep private notes for yourself (you are Nila, an AI companion) about a friend you " +
  "support, so you remember them next time you talk. Read the conversation and write ONE short, warm " +
  "sentence in the third person capturing what they were dealing with and how they seemed — the theme " +
  "and their state, not verbatim details and nothing more sensitive than necessary. Begin with " +
  '"They". No preamble, no quotation marks. If nothing meaningful was shared, reply with exactly: NONE';

/**
 * Summarise a finished session into a single memory note and store it (fire-and-forget). Skips short
 * sessions. Runs on-device (generateOnDevice) with a summariser prompt — no network, no new backend.
 */
export async function rememberSession(messages: NilaMessage[]): Promise<void> {
  const userTurns = messages.filter((m) => m.role === "user" && m.content.trim());
  if (userTurns.length < MIN_USER_TURNS) return;

  const transcript = messages
    .filter((m) => m.content && m.content.trim())
    .map((m) => `${m.role === "user" ? "Them" : "You"}: ${m.content.trim()}`)
    .join("\n")
    .slice(0, 6000);

  // On-device summariser. With no model loaded this simply returns null and we skip — session memory
  // is best-effort and must never block or reach the network.
  const note = await generateOnDevice(SUMMARIZER, [{ role: "user", content: transcript }]);
  if (note && !/^none[.!]?$/i.test(note.trim())) remember(note.trim());
}
