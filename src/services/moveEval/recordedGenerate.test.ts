import { describe, it, expect } from "vitest";
import { recordedGenerate } from "./recordedGenerate";

describe("recordedGenerate", () => {
  it("returns the recorded reply for a probe", async () => {
    const gen = recordedGenerate({ "should i quit": "That's not a quick-answer question." });
    expect(await gen("should i quit")).toBe("That's not a quick-answer question.");
  });

  it("matches case- and space-insensitively", async () => {
    const gen = recordedGenerate({ "Hey You There": "Hey, I'm right here." });
    expect(await gen("  hey you there ")).toBe("Hey, I'm right here.");
  });

  it("throws on a probe with no recorded reply (a real capture gap, not silent)", async () => {
    const gen = recordedGenerate({ a: "x" });
    await expect(gen("b")).rejects.toThrow(/no recorded reply/i);
  });
});
