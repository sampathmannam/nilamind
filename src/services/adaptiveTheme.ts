import type { UserState } from "../types/modes";

export type AdaptiveMode = "default" | "elevated" | "low";

export function computeAdaptiveMode(userState: UserState | null): AdaptiveMode {
  if (!userState || userState === "calm") return "default";
  if (userState === "elevated" || userState === "crisis") return "elevated";
  if (userState === "low" || userState === "anxious") return "low";
  return "default";
}

export function getAdaptiveCssClass(mode: AdaptiveMode): string {
  if (mode === "elevated") return "theme-elevated";
  if (mode === "low") return "theme-low";
  return "";
}

export function shouldReduceAnimations(mode: AdaptiveMode): boolean {
  return mode === "elevated";
}
