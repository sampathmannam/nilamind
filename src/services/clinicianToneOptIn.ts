import { computeConversationToneSummary, type ConversationToneSummary } from "./chatAffect";

/**
 * Pure state-transition for the clinician-report tone opt-in toggle. Extracted from
 * YourDataScreen.tsx so the freeze-at-click-time behavior — a fresh computation captured the instant
 * the toggle turns on, never a value merely computed at the component's last render — is unit-testable
 * without mounting the whole (very large) screen component. Call this directly from the toggle's
 * onChange handler and pass its return value straight into setState.
 *
 * Returns null when unchecked, OR when checked but the fresh call comes back null (data aged below the
 * floor since the component's last render — the toggle simply doesn't turn on in that case), OR the
 * freshly-computed ConversationToneSummary to freeze into state.
 */
export function resolveToneToggle(
  checked: boolean,
  periodDays: number,
  now: number = Date.now()
): ConversationToneSummary | null {
  if (!checked) return null;
  return computeConversationToneSummary(periodDays, now);
}
