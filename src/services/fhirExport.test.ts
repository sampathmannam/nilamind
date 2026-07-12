import { describe, it, expect } from "vitest";
import { buildFhirBundle } from "./fhirExport";
import type { AssessmentEntry } from "./assessments";

const a = (over: Partial<AssessmentEntry>): AssessmentEntry => ({
  id: "x", date: "2026-06-01", timestamp: "2026-06-01T10:00:00.000Z", instrument: "PHQ-9",
  responses: [], total: 12, severity: "Moderate", safetyFlag: false, ...over,
});

const parse = (json: string) => JSON.parse(json);
const obsFor = (bundle: { entry: { resource: Record<string, unknown> }[] }, instrumentCode: string) =>
  bundle.entry.map((e) => e.resource).find(
    (r) => r.resourceType === "Observation" && JSON.stringify(r.code).includes(instrumentCode),
  );

describe("buildFhirBundle", () => {
  it("produces a FHIR R4 collection Bundle with a Patient first", () => {
    const b = parse(buildFhirBundle({ generatedAt: "2026-07-11T00:00:00.000Z", assessments: [] }));
    expect(b.resourceType).toBe("Bundle");
    expect(b.type).toBe("collection");
    expect(b.timestamp).toBe("2026-07-11T00:00:00.000Z");
    expect(b.entry[0].resource.resourceType).toBe("Patient");
    expect(b.entry[0].resource.id).toBe("nilamind-user");
    expect(b.entry[0].resource.identifier).toBeUndefined(); // no subjectId → no identifier
    expect(b.entry[0].resource.name).toBeUndefined(); // anonymous — never a name
  });

  it("attaches the anonymous subject id when provided", () => {
    const b = parse(buildFhirBundle({ generatedAt: "2026-07-11T00:00:00.000Z", subjectId: "ma_abc123", assessments: [] }));
    expect(b.entry[0].resource.identifier[0]).toMatchObject({ system: "urn:nilamind:anon-local-id", value: "ma_abc123" });
  });

  it("maps PHQ-9 / GAD-7 / PHQ-2 to their verified LOINC codes as survey Observations", () => {
    const b = parse(buildFhirBundle({
      generatedAt: "2026-07-11T00:00:00.000Z",
      assessments: [
        a({ instrument: "PHQ-9", total: 15, severity: "Moderately severe", date: "2026-06-01" }),
        a({ instrument: "GAD-7", total: 9, severity: "Mild", date: "2026-06-02" }),
        a({ instrument: "PHQ-2", total: 4, severity: "Positive screen", date: "2026-06-03" }),
      ],
    }));
    const phq9 = obsFor(b, "44261-6")!;
    expect(phq9.status).toBe("final");
    expect((phq9.category as any)[0].coding[0].code).toBe("survey");
    expect((phq9.code as any).coding[0]).toMatchObject({ system: "http://loinc.org", code: "44261-6" });
    expect(phq9.valueInteger).toBe(15);
    expect(phq9.effectiveDateTime).toBe("2026-06-01");
    expect((phq9.subject as any).reference).toBe("Patient/nilamind-user");
    expect((phq9.interpretation as any)[0].text).toBe("Moderately severe");

    expect((obsFor(b, "70274-6")!.code as any).coding[0].code).toBe("70274-6"); // GAD-7
    expect((obsFor(b, "55758-7")!.code as any).coding[0].code).toBe("55758-7"); // PHQ-2
  });

  it("uses a text-only code (no fabricated LOINC) for instruments without an established code", () => {
    const b = parse(buildFhirBundle({
      generatedAt: "2026-07-11T00:00:00.000Z",
      assessments: [a({ instrument: "WHO-5", total: 60, severity: "Good wellbeing" })],
    }));
    const who = b.entry.map((e: any) => e.resource).find((r: any) => r.resourceType === "Observation");
    expect(who.code.coding).toBeUndefined(); // no invented LOINC
    expect(who.code.text).toMatch(/WHO-5/);
    expect(who.valueInteger).toBe(60);
  });

  it("adds a clinical note when the PHQ-9 self-harm item is endorsed", () => {
    const b = parse(buildFhirBundle({
      generatedAt: "2026-07-11T00:00:00.000Z",
      assessments: [a({ instrument: "PHQ-9", safetyFlag: true })],
    }));
    const phq9 = obsFor(b, "44261-6")!;
    expect((phq9.note as any)[0].text).toMatch(/self-harm/i);
  });

  it("orders Observations oldest-to-newest", () => {
    const b = parse(buildFhirBundle({
      generatedAt: "2026-07-11T00:00:00.000Z",
      assessments: [a({ date: "2026-06-30" }), a({ date: "2026-06-01" }), a({ date: "2026-06-15" })],
    }));
    const dates = b.entry.filter((e: any) => e.resource.resourceType === "Observation").map((e: any) => e.resource.effectiveDateTime);
    expect(dates).toEqual(["2026-06-01", "2026-06-15", "2026-06-30"]);
  });
});
