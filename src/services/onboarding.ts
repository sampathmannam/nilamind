// First-run onboarding state (world-class UX — guided first-use cuts first-week drop-off).
// Plain localStorage: this is a non-sensitive UI flag, not health data.

import { ls } from "./storageUtils";
import { getRegionCode, setRegionCode, type RegionCode } from "./crisisResources";

const DONE_KEY = "nilamind_onboarding_done";

export function hasCompletedOnboarding(): boolean {
  try {
    return ls()?.getItem(DONE_KEY) === "1";
  } catch {
    return false;
  }
}

export function completeOnboarding(): void {
  try {
    ls()?.setItem(DONE_KEY, "1");
  } catch {
    /* best-effort */
  }
}

/** Reset onboarding (used in tests / "clear all data" flows). */
export function resetOnboarding(): void {
  try {
    ls()?.removeItem(DONE_KEY);
  } catch {
    /* best-effort */
  }
}

/** The region chosen during onboarding is the app's crisis-line region. */
export function getOnboardingRegion(): RegionCode {
  return getRegionCode();
}

export function setOnboardingRegion(code: RegionCode): void {
  setRegionCode(code);
}
