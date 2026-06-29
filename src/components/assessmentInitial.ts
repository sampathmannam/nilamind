import { InstrumentId, INSTRUMENTS } from "../services/assessments";

/**
 * Decides whether AssessmentScreen should auto-start an instrument on mount instead of showing
 * the menu. Returns the instrument id to start, or null to fall through to the normal menu phase.
 * Guards against an unknown id so a bad caller can never wedge the screen on a blank "running" view.
 */
export function resolveInitialInstrument(
  initialInstrument: InstrumentId | undefined,
): InstrumentId | null {
  if (!initialInstrument) return null;
  return initialInstrument in INSTRUMENTS ? initialInstrument : null;
}
