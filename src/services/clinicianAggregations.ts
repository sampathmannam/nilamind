// Phase 20 (Holistic Clinician Report) — pure deterministic aggregators of existing on-device stores.
//
// These functions pull data the clinician PDF (clinicianReport.ts) already needed but did not aggregate.
// Each one is:
//   - pure (no Date.now() without an injected `now` parameter for staleness math)
//   - privacy-respecting (NEVER return raw PII fields a senior clinician did not ask for explicitly)
//   - tolerant of missing / corrupt storage (returns an empty summary; never throws)
//
// Wire to: clinicianReport.ts via ClinicianReportInput extensions, fed by YourDataScreen.tsx.

import { isPactStale, type Pact } from "./pact";

/**
 * Status summary of the patient's pact (the "letter to my unwell self" + named trusted person).
 * Includes only metadata the patient has consented to by storing; never the name or letter content.
 */
export interface ClinicianPactForReport {
  /** True iff the patient has a saved, non-empty pact. */
  exists: boolean;
  /** True iff the pact records a non-whitespace trusted-person name. */
  hasName: boolean;
  /** True iff the pact records a non-whitespace contact for the trusted person. */
  hasContact: boolean;
  /** ISO date (YYYY-MM-DD) the pact was first written, or null. */
  writtenAt: string | null;
  /** ISO date (YYYY-MM-DD) the patient last re-confirmed the pact, or null. */
  ratifiedAt: string | null;
  /** True iff the last re-confirmation was more than 90 days before `now`. */
  isStale: boolean;
}

/**
 * Reduce the on-device {@link Pact} (or null) to a privacy-respecting summary for the clinician PDF.
 *
 * Research basis (Phase 20 design): the pact exists to ensure the patient has named support and
 * self-authored instructions for future unwell moments. A clinician seeing the file benefits from
 * knowing (a) the patient has such an arrangement, (b) whether contact info is on it, (c) whether
 * it is stale (the well-self should re-confirm). They do NOT benefit from the letter text or the
 * named person's identity on a share sheet — that is PHI the patient did not consent to export.
 */
export function summarizePactForReport(
  pact: Pact | null,
  now: Date = new Date(),
): ClinicianPactForReport {
  if (!pact) {
    return {
      exists: false,
      hasName: false,
      hasContact: false,
      writtenAt: null,
      ratifiedAt: null,
      isStale: false,
    };
  }
  const hasName = !!pact.person?.name?.trim();
  const hasContact = !!pact.person?.contact?.trim();
  return {
    exists: true,
    hasName,
    hasContact,
    writtenAt: pact.writtenAt ? pact.writtenAt.slice(0, 10) : null,
    ratifiedAt: pact.ratifiedAt ? pact.ratifiedAt.slice(0, 10) : null,
    isStale: isPactStale(pact, now.toISOString()),
  };
}
