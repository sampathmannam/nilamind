import { describe, it, expect } from "vitest";
import { setEmaPrefill, consumeEmaPrefill } from "./emaPrefill";

describe("emaPrefill", () => {
  it("hands the value over exactly once", () => {
    setEmaPrefill(-1);
    expect(consumeEmaPrefill()).toBe(-1);
    expect(consumeEmaPrefill()).toBeNull();
  });

  it("returns null when nothing was set", () => {
    expect(consumeEmaPrefill()).toBeNull();
  });

  it("last write wins", () => {
    setEmaPrefill(3);
    setEmaPrefill(0);
    expect(consumeEmaPrefill()).toBe(0);
  });
});
