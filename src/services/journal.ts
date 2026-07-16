import { secureLocal } from "./secureLocal";
import type { JournalEntry } from "../types";

const KEY = "nilamind_journal";

/** All entries, newest-first by timestamp. Never throws — corrupted storage degrades to []. */
export function loadJournalEntries(): JournalEntry[] {
  try {
    const raw = secureLocal.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as JournalEntry[]).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  } catch {
    // Static message only — never log the raw error: it can echo a snippet of decrypted
    // journal content to logcat (same rule DiaryCardScreen's load handler follows).
    console.error("Failed to parse stored journal entries");
    return [];
  }
}

/** Save (or replace, matching by id) a single entry. */
export function saveJournalEntry(entry: JournalEntry): void {
  const all = loadJournalEntries().filter((e) => e.id !== entry.id);
  all.push(entry);
  secureLocal.setItem(KEY, JSON.stringify(all));
}

export function deleteJournalEntry(id: string): void {
  const all = loadJournalEntries().filter((e) => e.id !== id);
  secureLocal.setItem(KEY, JSON.stringify(all));
}

/** Newest-date-first groups for the feed, each date's own entries kept newest-first. */
export function groupByDate(entries: JournalEntry[]): { date: string; entries: JournalEntry[] }[] {
  const byDate = new Map<string, JournalEntry[]>();
  for (const e of entries) {
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  return Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, es]) => ({ date, entries: [...es].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)) }));
}
