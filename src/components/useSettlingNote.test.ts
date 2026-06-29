import { describe, it, expect } from "vitest";
import { settlingNoteFor } from "./useSettlingNote";

describe("settlingNoteFor — escalating wait copy", () => {
  it("phase 0 → the caller's base label (a fast reply shows no reassurance)", () => {
    expect(settlingNoteFor(0, "Nila is thinking...")).toBe("Nila is thinking...");
    expect(settlingNoteFor(0, "Thinking…")).toBe("Thinking…");
  });

  it("phase 1 → presence reassurance, independent of the base", () => {
    expect(settlingNoteFor(1, "Nila is thinking...")).toBe("Nila's taking a moment — I'm right here.");
    expect(settlingNoteFor(1, "Thinking…")).toBe("Nila's taking a moment — I'm right here.");
  });

  it("phase 2 → gently acknowledges the longer (cold) load", () => {
    expect(settlingNoteFor(2, "Thinking…")).toBe("Still here — this one's taking a little longer.");
  });

  it("never shows a false timing promise (no 'almost'/'seconds')", () => {
    for (const p of [0, 1, 2]) {
      const s = settlingNoteFor(p, "Thinking…").toLowerCase();
      expect(s).not.toMatch(/almost|second|minute|soon/);
    }
  });
});
