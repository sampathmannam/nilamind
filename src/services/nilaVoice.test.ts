import { describe, it, expect } from "vitest";
import { buildNilaSystem } from "./nila";

describe("Nila voice (short companion persona)", () => {
  const sys = buildNilaSystem("why does staying calm help");

  it("still carries the §9 crisis directive verbatim", () => {
    expect(sys).toContain("What you just shared matters more than anything else right now");
  });

  it("instructs prose over markdown/lists and against explainer preambles", () => {
    expect(sys.toLowerCase()).toMatch(/no bullet|no markdown|no bold/);
    expect(sys.toLowerCase()).toContain("that's a great question");
  });

  it("shows the reflect-and-ask move via at least one exemplar", () => {
    expect(sys.toLowerCase()).toContain("what's been the hardest part");
  });
});
