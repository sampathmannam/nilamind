import { useTimeOfDay, type TimeOfDay } from "./useTimeOfDay";
import { getUserState } from "../services/modeEngine";
import type { UserState } from "../types/modes";

export type TimeModeBucket = "morning" | "day" | "evening" | "night";

export interface UserContext {
  timeOfDay: TimeOfDay;
  /** Coarse time bucket matching ModeConfig.TimeMode (morning | day | evening | night). */
  timeMode: TimeModeBucket;
  state: UserState | null;
  /** Low-capacity states (anxious | low | elevated | crisis) get a gentler register. */
  lowCapacity: boolean;
  isNight: boolean;
  isMorning: boolean;
  isEvening: boolean;
}

/** Pure mapping from the granular time-of-day to the coarse ModeConfig bucket. Testable without a clock. */
export function timeModeFromTimeOfDay(timeOfDay: TimeOfDay): TimeModeBucket {
  if (timeOfDay === "morning") return "morning";
  if (timeOfDay === "evening" || timeOfDay === "night") return timeOfDay;
  return "day";
}

/**
 * Single adaptive-context hook for the home/tool surfaces. Composes the live time-of-day with the
 * device-derived user state (never network) so any screen can render time- and state-aware UI from
 * one source. Pure composition of existing hooks — deterministic and testable.
 * (UX-3: Adaptive Home Screen.)
 */
export function useUserContext(): UserContext {
  const { timeOfDay, isNight, isMorning, isEvening } = useTimeOfDay();
  const state = getUserState();
  const lowCapacity = state !== null && ["anxious", "low", "elevated", "crisis"].includes(state);

  const timeMode = timeModeFromTimeOfDay(timeOfDay);

  return { timeOfDay, timeMode, state, lowCapacity, isNight, isMorning, isEvening };
}
