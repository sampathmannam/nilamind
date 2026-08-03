import { describe, it, expect } from "vitest";
import { generateTinyId } from "./idGen";

describe("generateTinyId", () => {
  it("returns a string starting with 'id_'", () => {
    const id = generateTinyId();
    expect(typeof id).toBe("string");
    expect(id.startsWith("id_")).toBe(true);
  });

  it("is unique across calls separated by time", async () => {
    const first = generateTinyId();
    // Wait 2ms to ensure Date.now() advances
    await new Promise((r) => setTimeout(r, 2));
    const second = generateTinyId();
    expect(first).not.toBe(second);
  });

  it("contains only digits after the prefix", () => {
    const id = generateTinyId();
    const suffix = id.slice(3);
    expect(/^\d+$/.test(suffix)).toBe(true);
  });
});
