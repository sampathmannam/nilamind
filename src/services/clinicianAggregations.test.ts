import { describe, it, expect } from "vitest";
import type { Pact } from "./pact";
import { summarizePactForReport, type ClinicianPactForReport } from "./clinicianAggregations";

// Phase 20.1 (B12): pact state goes into the clinician report as a privacy-preserving status summary,
// NEVER as the patient's name or letter content. Tests guard that boundary explicitly.
describe("summarizePactForReport (Phase 20.1 B12)", () => {
  const validPact: Pact = {
    letter: "When unwell I will reach out to the people listed here.",
    person: { name: "Roommate Alex" },
    writtenAt: "2026-01-15T09:00:00.000Z",
    ratifiedAt: "2026-06-30T18:30:00.000Z",
  };

  it("returns an empty/inactive summary when no pact exists", () => {
    const s = summarizePactForReport(null);
    expect(s).toEqual<ClinicianPactForReport>({
      exists: false,
      hasName: false,
      hasContact: false,
      writtenAt: null,
      ratifiedAt: null,
      isStale: false,
    });
  });

  it("returns exists/hasName=true, hasContact=false, and dates as YYYY-MM-DD when pact has a name only", () => {
    const s = summarizePactForReport(validPact);
    expect(s.exists).toBe(true);
    expect(s.hasName).toBe(true);
    expect(s.hasContact).toBe(false);
    expect(s.writtenAt).toBe("2026-01-15");
    expect(s.ratifiedAt).toBe("2026-06-30");
    expect(s.isStale).toBe(false);
  });

  it("hasContact=true when the pact stores a contact string", () => {
    const s = summarizePactForReport({ ...validPact, person: { name: "Alex", contact: "alex@example.test" } });
    expect(s.hasContact).toBe(true);
    expect(s.hasName).toBe(true);
  });

  it("flags isStale=true when the last ratification is > 90 days before `now`", () => {
    const stalePact: Pact = { ...validPact, ratifiedAt: "2026-01-01T00:00:00.000Z" };
    const now = new Date("2026-06-15T12:00:00.000Z");
    const s = summarizePactForReport(stalePact, now);
    expect(s.isStale).toBe(true);
  });

  it("flag is false at exactly 90 days (boundary owned by isPactStale)", () => {
    const p90: Pact = { ...validPact, ratifiedAt: "2026-04-01T00:00:00.000Z" };
    const now = new Date("2026-06-30T00:00:00.000Z");
    const s = summarizePactForReport(p90, now);
    expect(s.isStale).toBe(false);
  });

  it("treats whitespace-only name/contact as hasName=false / hasContact=false", () => {
    const wsPact: Pact = {
      ...validPact,
      person: { name: "   ", contact: "\t" },
    };
    const s = summarizePactForReport(wsPact);
    expect(s.hasName).toBe(false);
    expect(s.hasContact).toBe(false);
  });

  // Privacy guard: regressing to "accidentally stringify the pact into the report" is exactly the
  // kind of failure mode AGENTS.md warns about for a safety-critical privacy boundary. This test
  // is the lock that catches it.
  it("the returned summary contains no part of the letter, person name, or contact string", () => {
    const secretPact: Pact = {
      letter: "RAW_SECRET_LETTER_TEXT_DO_NOT_LEAK",
      person: { name: "RAW_SECRET_NAME", contact: "RAW_SECRET_CONTACT@example.test" },
      writtenAt: "2026-01-15T09:00:00.000Z",
      ratifiedAt: "2026-06-30T18:30:00.000Z",
    };
    const s = JSON.stringify(summarizePactForReport(secretPact));
    expect(s).not.toContain("RAW_SECRET_LETTER_TEXT_DO_NOT_LEAK");
    expect(s).not.toContain("RAW_SECRET_NAME");
    expect(s).not.toContain("RAW_SECRET_CONTACT");
    expect(s).not.toContain("alex@example.test");
    // Sanity: the safe shape IS the only thing present.
    expect(s).toContain("exists");
    expect(s).toContain("hasName");
  });
});
