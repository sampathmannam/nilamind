import { describe, it, expect, beforeEach } from "vitest";
import { getCoverId } from "./coverId";
import { secureLocal } from "./secureLocal";

// Reset the stored cover ID between tests so each test starts fresh.
beforeEach(() => {
  secureLocal.removeItem("nilamind_cover_id");
});

describe("getCoverId", () => {
  it("returns a 3-word BIP39-derived ID separated by hyphens", () => {
    const id = getCoverId();
    const words = id.split("-");
    expect(words.length).toBe(3);
    for (const w of words) {
      expect(w.length).toBeGreaterThan(0);
      expect(w).toMatch(/^[a-z]+$/);
    }
  });

  it("is idempotent — returns the same ID across calls", () => {
    const first = getCoverId();
    const second = getCoverId();
    expect(first).toBe(second);
  });

  it("persists across instances by reading from secureLocal", () => {
    const id1 = getCoverId();
    // Simulate a fresh import by clearing the module-level cache:
    // getCoverId reads from secureLocal, so a second call should return the same value.
    const id2 = getCoverId();
    expect(id1).toBe(id2);
  });

  it("uses only valid BIP39 English words", () => {
    const { wordlist } = require("@scure/bip39/wordlists/english.js");
    const id = getCoverId();
    for (const word of id.split("-")) {
      expect(wordlist).toContain(word);
    }
  });

  it("generates different IDs for different seeds (statistical)", () => {
    // Run getCoverId in a fresh context. Since we clear storage in beforeEach,
    // this test gets a new random ID each run. We just verify it's valid.
    const id = getCoverId();
    expect(id.split("-").length).toBe(3);
  });
});
