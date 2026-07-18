import { secureLocal } from "./secureLocal";
import { loadSecureArray } from "./secureData";
import type { JournalEntry } from "../types";

const KEY = "nilamind_journal";

/** All entries, newest-first by timestamp. Never throws — corrupt storage degrades to [] via the shared
 *  loadSecureArray primitive, which parses/guards centrally and stays silent (never logs, so it can't echo
 *  a snippet of decrypted journal content to logcat — the same rule DiaryCardScreen's load follows). */
export function loadJournalEntries(): JournalEntry[] {
  return loadSecureArray<JournalEntry>(KEY).sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
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
