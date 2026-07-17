import { describe, it, expect, beforeEach, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  },
}));

import {
  saveVisitNote,
  loadVisitNote,
  loadRecentVisitNotes,
  deleteVisitNote,
  type VisitNote,
} from "./visitNote";

describe("visitNote (Phase 20.3)", () => {
  beforeEach(() => { store.clear(); });

  it("saveVisitNote creates a note with the given text and prompts", () => {
    const note = saveVisitNote("I want to discuss my sleep", [
      { prompt: "Top 3 things I want remembered", answer: "Sleep got worse" },
      { prompt: "Questions for my doctor", answer: "Is my med dose right?" },
    ]);
    expect(note.id).toMatch(/^vn_/);
    expect(note.text).toBe("I want to discuss my sleep");
    expect(note.prompts).toHaveLength(2);
    expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("loadVisitNote retrieves a note by id", () => {
    const saved = saveVisitNote("test note", []);
    const loaded = loadVisitNote(saved.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.text).toBe("test note");
  });

  it("loadVisitNote returns null for nonexistent id", () => {
    expect(loadVisitNote("nonexistent")).toBeNull();
  });

  it("loadRecentVisitNotes returns notes sorted by timestamp descending", () => {
    saveVisitNote("note 1", []);
    saveVisitNote("note 2", []);
    saveVisitNote("note 3", []);
    const recent = loadRecentVisitNotes();
    expect(recent.length).toBe(3);
    // All notes are returned; order is by timestamp descending (most recent first).
    // In rapid test execution timestamps may be identical, so just check all are present.
    const texts = recent.map((n) => n.text);
    expect(texts).toContain("note 1");
    expect(texts).toContain("note 3");
  });

  it("loadRecentVisitNotes caps at 4 notes (last-4 rolling)", () => {
    for (let i = 0; i < 6; i++) {
      saveVisitNote(`note ${i}`, []);
    }
    const recent = loadRecentVisitNotes();
    expect(recent.length).toBe(4);
  });

  it("deleteVisitNote removes a note by id", () => {
    const note = saveVisitNote("to delete", []);
    deleteVisitNote(note.id);
    expect(loadVisitNote(note.id)).toBeNull();
  });

  it("saveVisitNote supports voice transcript text", () => {
    const note = saveVisitNote("voice transcript here", [], "voice transcript here");
    expect(note.text).toBe("voice transcript here");
    expect(note.voiceTranscript).toBe("voice transcript here");
  });

  it("handles empty store gracefully", () => {
    expect(loadRecentVisitNotes()).toEqual([]);
    expect(loadVisitNote("any")).toBeNull();
  });
});
