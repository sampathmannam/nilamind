import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import { loadJournalEntries, saveJournalEntry, deleteJournalEntry, groupByDate } from "./journal";
import type { JournalEntry } from "../types";

beforeEach(() => store.clear());

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: over.id ?? "id_1",
  date: over.date ?? "2026-07-16",
  timestamp: over.timestamp ?? "2026-07-16T20:00:00.000Z",
  mode: over.mode ?? "free",
  text: over.text ?? "hello",
  ...over,
});

describe("journal service", () => {
  it("returns an empty array when nothing is stored", () => {
    expect(loadJournalEntries()).toEqual([]);
  });

  it("saves and loads an entry", () => {
    saveJournalEntry(entry());
    expect(loadJournalEntries()).toEqual([entry()]);
  });

  it("prepends new entries so load returns newest-first", () => {
    saveJournalEntry(entry({ id: "id_1", timestamp: "2026-07-16T08:00:00.000Z" }));
    saveJournalEntry(entry({ id: "id_2", timestamp: "2026-07-16T20:00:00.000Z" }));
    expect(loadJournalEntries().map((e) => e.id)).toEqual(["id_2", "id_1"]);
  });

  it("saving an entry with an existing id replaces it in place rather than duplicating", () => {
    saveJournalEntry(entry({ id: "id_1", text: "first draft" }));
    saveJournalEntry(entry({ id: "id_1", text: "edited" }));
    const all = loadJournalEntries();
    expect(all.length).toBe(1);
    expect(all[0].text).toBe("edited");
  });

  it("deletes an entry by id", () => {
    saveJournalEntry(entry({ id: "id_1" }));
    saveJournalEntry(entry({ id: "id_2" }));
    deleteJournalEntry("id_1");
    expect(loadJournalEntries().map((e) => e.id)).toEqual(["id_2"]);
  });

  it("recovers to an empty array on corrupted storage rather than throwing", () => {
    store.set("nilamind_journal", "{not valid json");
    expect(loadJournalEntries()).toEqual([]);
  });

  it("groupByDate groups newest-date-first, preserving each date's own order", () => {
    const groups = groupByDate([
      entry({ id: "a", date: "2026-07-16", timestamp: "2026-07-16T20:00:00.000Z" }),
      entry({ id: "b", date: "2026-07-16", timestamp: "2026-07-16T09:00:00.000Z" }),
      entry({ id: "c", date: "2026-07-15", timestamp: "2026-07-15T10:00:00.000Z" }),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-07-16", "2026-07-15"]);
    expect(groups[0].entries.map((e) => e.id)).toEqual(["a", "b"]);
  });
});
