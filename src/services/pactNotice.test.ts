import { describe, it, expect, beforeEach, vi } from "vitest";

const store: Record<string, string> = {};
vi.mock("./secureLocal", () => ({ secureLocal: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } } }));
vi.mock("./pact", () => ({ loadPact: vi.fn() }));
vi.mock("./sleepInsight", () => ({ selfReportSleepSignal: vi.fn() }));
vi.mock("./nilaInflection", () => ({ detectInflections: vi.fn(() => []) }));
vi.mock("./inflectionPrefs", () => ({ getInflectionEnabled: vi.fn(() => true) }));
vi.mock("./assessments", () => ({ loadAssessments: vi.fn(() => []) }));

import { activePactNotice, dismissPactNoticeToday, reachOutSmsUri } from "./pactNotice";
import { loadPact } from "./pact";
import { selfReportSleepSignal } from "./sleepInsight";
import { detectInflections } from "./nilaInflection";

const PACT = { letter: "hold on", person: { name: "Sam", contact: "+1 (555) 010" }, writtenAt: "", ratifiedAt: "" };

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  vi.clearAllMocks();
  (detectInflections as any).mockReturnValue([]);
  (selfReportSleepSignal as any).mockReturnValue(null);
});

describe("activePactNotice", () => {
  it("null when there's no pact", () => {
    (loadPact as any).mockReturnValue(null);
    expect(activePactNotice("2026-06-29")).toBeNull();
  });

  it("fires on a short-sleep run when a pact exists", () => {
    (loadPact as any).mockReturnValue(PACT);
    (selfReportSleepSignal as any).mockReturnValue({ firing: true, nightsBelow: 3, baselineHours: 8, detail: "" });
    const n = activePactNotice("2026-06-29")!;
    expect(n.person.name).toBe("Sam");
    expect(n.reason).toContain("3 nights");
  });

  it("fires on a mood deterioration when sleep is quiet", () => {
    (loadPact as any).mockReturnValue(PACT);
    (detectInflections as any).mockReturnValue([{ direction: "deterioration" }]);
    expect(activePactNotice("2026-06-29")?.reason).toContain("heavier");
  });

  it("null when dismissed today, re-shows the next day", () => {
    (loadPact as any).mockReturnValue(PACT);
    (selfReportSleepSignal as any).mockReturnValue({ firing: true, nightsBelow: 3 });
    dismissPactNoticeToday("2026-06-29");
    expect(activePactNotice("2026-06-29")).toBeNull();
    expect(activePactNotice("2026-06-30")).not.toBeNull();
  });
});

describe("reachOutSmsUri", () => {
  it("builds an sms: uri with a normalized number + prefilled body", () => {
    const uri = reachOutSmsUri({ name: "Sam", contact: "+1 (555) 010" });
    expect(uri.startsWith("sms:+1555010?body=")).toBe(true);
    expect(decodeURIComponent(uri.split("body=")[1])).toContain("rough patch");
  });
  it("empty when there's no contact number", () => {
    expect(reachOutSmsUri({ name: "Sam" })).toBe("");
  });
});
