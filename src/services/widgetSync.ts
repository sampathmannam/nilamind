// Home-screen widget mirror (AUTOPILOT Phase 7).
//
// PRIVACY: the widget can't read our encrypted store (the DEK lives only in the app's WebView). So
// native code reads a tiny mirror written here via Capacitor Preferences → SharedPreferences. We
// mirror ONLY a day-count and a neutral label — never emotions, intensities, diary, or any health
// content. A streak integer on a home screen is the most we expose, and only if the user adds the
// widget. Best-effort: failures never block the app.

import { Preferences } from "@capacitor/preferences";
import { computeCompassionateStreak } from "./streaks";

export async function syncWidget(): Promise<void> {
  try {
    const s = computeCompassionateStreak();
    const label = s.lapsed
      ? "Welcome back"
      : s.activeToday
      ? "Checked in today 💙"
      : s.current > 0
      ? "Keep it gentle"
      : "Tap to check in";
    await Preferences.set({ key: "ma_widget_streak", value: String(s.current) });
    await Preferences.set({ key: "ma_widget_label", value: label });
    await Preferences.set({ key: "ma_widget_emoji", value: s.emoji });
  } catch {
    /* widget mirror is best-effort */
  }
}
