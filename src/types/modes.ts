// Mode types for the Living Interface architecture.

export type TimeMode = "morning" | "day" | "evening" | "night";

export type UserState = "calm" | "anxious" | "low" | "elevated" | "crisis";

export interface ModeConfig {
  timeMode: TimeMode;
  userState: UserState | null;
  hasCheckedIn: boolean;
  greeting: string;
  question: string;
  stateColor: string;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  action: () => void;
}
