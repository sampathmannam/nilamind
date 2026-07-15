import { describe, it, expect } from "vitest";
import {
  GOLDEN_TRANSCRIPTS,
  transcriptsByMove,
  availableMoves,
  type GoldenTranscript,
} from "./goldenTranscripts";

describe("goldenTranscripts — corpus integrity", () => {
  it("has at least 10 transcripts", () => {
    expect(GOLDEN_TRANSCRIPTS.length).toBeGreaterThanOrEqual(10);
  });

  it("every transcript has all required fields", () => {
    for (const t of GOLDEN_TRANSCRIPTS) {
      expect(t.id).toBeTruthy();
      expect(t.situation).toBeTruthy();
      expect(t.user).toBeTruthy();
      expect(t.nila).toBeTruthy();
      expect(t.move).toBeTruthy();
      expect(t.register).toBeTruthy();
      expect(t.emphasis).toBeTruthy();
    }
  });

  it("every transcript's move is a valid move type", () => {
    const validMoves = ["CLARIFY", "REFLECT_ASK", "DEEPEN", "HOLD", "REPAIR", "ANSWER"];
    for (const t of GOLDEN_TRANSCRIPTS) {
      expect(validMoves).toContain(t.move);
    }
  });

  it("every transcript's register is valid", () => {
    const validRegisters = ["mild", "moderate", "distressed"];
    for (const t of GOLDEN_TRANSCRIPTS) {
      expect(validRegisters).toContain(t.register);
    }
  });

  it("every transcript's nila reply has 10+ words", () => {
    for (const t of GOLDEN_TRANSCRIPTS) {
      expect(t.nila.split(/\s+/).length).toBeGreaterThanOrEqual(10);
    }
  });

  it("no duplicate IDs", () => {
    const ids = GOLDEN_TRANSCRIPTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("goldenTranscripts — transcriptsByMove", () => {
  it("returns transcripts for a valid move", () => {
    const hold = transcriptsByMove("HOLD");
    expect(hold.length).toBeGreaterThan(0);
    for (const t of hold) {
      expect(t.move).toBe("HOLD");
    }
  });

  it("returns empty for nonexistent move", () => {
    const none = transcriptsByMove("NONEXISTENT");
    expect(none.length).toBe(0);
  });

  it("covers all 6 move types", () => {
    const moves = ["CLARIFY", "REFLECT_ASK", "DEEPEN", "HOLD", "REPAIR", "ANSWER"];
    for (const move of moves) {
      expect(transcriptsByMove(move).length).toBeGreaterThan(0);
    }
  });
});

describe("goldenTranscripts — availableMoves", () => {
  it("returns at least 6 move types", () => {
    expect(availableMoves().length).toBeGreaterThanOrEqual(6);
  });
});
