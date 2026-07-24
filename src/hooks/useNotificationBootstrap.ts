import { useEffect } from "react";
import { syncDailyReminders, syncEmaCheckins, syncWeeklyDigest, registerNotificationActionTypes, syncWindDownReminder, syncMedicationReminders, syncInsightNotification } from "../services/notifications";
import { loadMedications } from "../services/medicationAdherence";

/**
 * Consolidates all boot-time notification scheduling into a single effect.
 * Replaces 6 individual useEffects in App.tsx.
 */
export function useNotificationBootstrap(): void {
  useEffect(() => {
    void registerNotificationActionTypes();
    void syncDailyReminders({ request: false });
    void syncWeeklyDigest({ request: false });
    void syncWindDownReminder();
    void syncInsightNotification();
    void syncEmaCheckins({ request: false });
    try {
      const meds = loadMedications();
      if (meds.length > 0) void syncMedicationReminders(meds);
    } catch { /* best-effort */ }
  }, []);
}
