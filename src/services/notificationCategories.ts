// P6.5 — notification CATEGORIES. The user can toggle each notification type independently so Nila never
// sends a class of nudge they don't want. Five categories (FEATURES_PLAN): check-in reminder (EMA), armed
// check-in, insight nudge (daily reminder), protocol continuation (in-chat offer), crisis follow-up (the
// post-§9 aftercare card). Each maps to a real surface — OS notification OR in-chat prompt — so a toggle is
// never dead. Safe default: everything ON (we never silently mute; an unknown id is treated as enabled).
// Non-sensitive UI pref → plain localStorage (sync, pre-gate safe), consistent with reminders.ts.

import { ls } from "./storageUtils";

export type NotificationCategoryId = "checkin" | "armed" | "insight" | "protocol" | "crisis_followup";

export interface NotificationCategory {
  id: NotificationCategoryId;
  label: string;
  description: string;
}

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { id: "checkin", label: "Check-in reminders", description: "Gentle EMA quick-check-in pings" },
  { id: "armed", label: "Armed check-ins", description: "The check-in you asked Nila to remind you about" },
  { id: "insight", label: "Insight nudges", description: "Your daily gentle nudge from Nila" },
  { id: "protocol", label: "Protocol continuation", description: "Offers to keep going with a wellness program" },
  { id: "crisis_followup", label: "Crisis follow-up", description: "Post-crisis aftercare check-in (still always reachable in crisis)" },
];

export type CategoryPrefs = Record<NotificationCategoryId, boolean>;

const KEY = "nilamind_notif_categories";

export const defaultCategoryPrefs: CategoryPrefs = {
  checkin: true,
  armed: true,
  insight: true,
  protocol: true,
  crisis_followup: true,
};

export function getCategoryPrefs(): CategoryPrefs {
  try {
    const raw = ls()?.getItem(KEY);
    if (!raw) return { ...defaultCategoryPrefs };
    const parsed = JSON.parse(raw) as Partial<CategoryPrefs>;
    return { ...defaultCategoryPrefs, ...parsed };
  } catch {
    return { ...defaultCategoryPrefs };
  }
}

export function setCategoryEnabled(id: NotificationCategoryId, enabled: boolean): void {
  const next = { ...getCategoryPrefs(), [id]: enabled };
  try { ls()?.setItem(KEY, JSON.stringify(next)); } catch { /* best-effort */ }
}

/** True when the category may fire. Unknown ids default to enabled (never silently mute). */
export function isCategoryEnabled(id: NotificationCategoryId): boolean {
  return getCategoryPrefs()[id] !== false;
}
