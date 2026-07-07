import { describe, it, expect, vi } from "vitest";

vi.mock("./moodHistory", () => ({ loadMoodHistory: vi.fn(() => []) }));
vi.mock("./secureLocal", () => ({
  secureLocal: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  },
  appendToSecureArray: vi.fn(),
}));

import { loadMoodHistory } from "./moodHistory";
import { buildCaregiverSnapshot, caregiverSummaryText } from "./caregiverShare";

describe("caregiverShare", () => {
  it("builds a non-diagnostic snapshot with crisis lines", () => {
    (loadMoodHistory as any).mockReturnValue([
      { date: "2026-07-01", intensity: 3 },
      { date: "2026-07-02", intensity: 4 },
      { date: "2026-07-03", intensity: 2 },
    ]);
    const s = buildCaregiverSnapshot();
    expect(s.headline).toContain("NilaMind");
    expect(s.lines.length).toBeGreaterThan(0);
    expect(s.lines.join(" ")).not.toMatch(/diagnos|treat|therapy|disorder/i);
    expect(s.crisisLines.length).toBeGreaterThan(0);
  });

  it("produces copyable plain text", () => {
    (loadMoodHistory as any).mockReturnValue([]);
    const txt = caregiverSummaryText();
    expect(txt).toContain("NilaMind");
    expect(txt).toContain("•");
  });
});
