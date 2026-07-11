// FHIR R4 export of NilaMind's validated assessments — a step toward real clinical interoperability
// (APA App Evaluation Level 5). Each completed screening becomes a FHIR Observation (survey category,
// valueInteger, LOINC-coded where an established code exists), wrapped in a collection Bundle.
//
// EXPERIMENTAL and honest by construction:
//  - LOINC codes are only attached where a real, verified code exists (PHQ-9 / GAD-7 / PHQ-2). WHO-5 and
//    PSS-4 have no established LOINC total-score code, so they are exported with a text-only `code` rather
//    than a fabricated one — a wrong code is worse than no code.
//  - The subject is an anonymous, hash-derived local id (no PII). Day-level precision (effectiveDateTime =
//    the completion date) because that is all we reliably record.
// User-initiated, saved to device only — nothing is transmitted. Validate against your system before use.

import type { AssessmentEntry, InstrumentId } from "./assessments";

/** Verified LOINC total-score codes (checked against loinc.org). Only instruments with a real code appear. */
const LOINC: Partial<Record<InstrumentId, { code: string; display: string }>> = {
  "PHQ-9": { code: "44261-6", display: "Patient Health Questionnaire 9 item (PHQ-9) total score [Reported]" },
  "GAD-7": { code: "70274-6", display: "Generalized anxiety disorder 7 item (GAD-7) total score [Reported.PHQ]" },
  "PHQ-2": { code: "55758-7", display: "Patient Health Questionnaire 2 item (PHQ-2) total score [Reported]" },
};

/** Human-readable fallbacks for instruments without an established LOINC total-score code. */
const TEXT: Partial<Record<InstrumentId, string>> = {
  "WHO-5": "WHO-5 Well-Being Index total score (no established LOINC code)",
  "PSS-4": "Perceived Stress Scale-4 (PSS-4) total score (no established LOINC code)",
};

const SUBJECT_ID = "nilamind-user";

export interface FhirExportInput {
  generatedAt: string;        // ISO timestamp
  subjectId?: string | null;  // anonymous local (BIP39-derived) id, or null
  assessments: AssessmentEntry[];
}

function observation(a: AssessmentEntry): Record<string, unknown> {
  const loinc = LOINC[a.instrument];
  const code = loinc
    ? { coding: [{ system: "http://loinc.org", code: loinc.code, display: loinc.display }], text: loinc.display }
    : { text: TEXT[a.instrument] ?? `${a.instrument} total score` };

  const obs: Record<string, unknown> = {
    resourceType: "Observation",
    status: "final",
    category: [
      { coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "survey", display: "Survey" }] },
    ],
    code,
    subject: { reference: `Patient/${SUBJECT_ID}` },
    effectiveDateTime: a.date, // day-level precision — a valid FHIR date
    valueInteger: a.total,
    interpretation: [{ text: a.severity }],
  };
  if (a.safetyFlag) {
    obs.note = [{ text: "Self-harm screening item endorsed (PHQ-9 item 9) — clinical follow-up indicated." }];
  }
  return obs;
}

/** Build a FHIR R4 collection Bundle of the user's assessments as Observations. Pure given its input. */
export function buildFhirBundle(input: FhirExportInput): string {
  const patient: Record<string, unknown> = { resourceType: "Patient", id: SUBJECT_ID };
  if (input.subjectId) {
    patient.identifier = [{ system: "urn:nilamind:anon-local-id", value: input.subjectId }];
  }

  const entries: { resource: Record<string, unknown> }[] = [
    { resource: patient },
    ...input.assessments
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.timestamp.localeCompare(b.timestamp))
      .map((a) => ({ resource: observation(a) })),
  ];

  return JSON.stringify(
    {
      resourceType: "Bundle",
      type: "collection",
      timestamp: input.generatedAt,
      entry: entries,
    },
    null,
    2,
  );
}
