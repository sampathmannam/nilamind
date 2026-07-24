import { useEffect } from "react";
import { LocalNotifications } from "@capacitor/local-notifications";
import { enableDndFor } from "../services/dnd";
import { logMedication } from "../services/medicationAdherence";
import { recordEngagement, recordDismissal } from "../services/notificationBudget";
import { recordNotificationOpen } from "../services/notificationEngagement";
import { scheduleReminderAt } from "../services/notifications";
import type { NavApi } from "../services/navStore";

/**
 * Routes local notification taps to the correct screen/action.
 * Extracted from App.tsx lines 348-382.
 */
export function useNotificationTapRouter(go: NavApi["go"]): void {
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      try {
        const actionId = action?.actionId as string | undefined;
        if (actionId === "snooze_1h") { enableDndFor(1); return; }
        if (actionId === "snooze_3h") { enableDndFor(3); return; }
        if (actionId === "taken") {
          const medId = action?.notification?.extra?.medId;
          if (medId) { try { logMedication(medId, true, []); } catch { /* best-effort */ } }
          recordEngagement();
          return;
        }
        if (actionId === "remind_30m") {
          const medName = action?.notification?.body?.replace("Time for ", "")?.split(" ")[0] || "";
          scheduleReminderAt(new Date(Date.now() + 30 * 60_000), `Time for ${medName} — gentle reminder`, "NilaMind", { channelId: "nila_medication" }).catch(() => {});
          return;
        }
        if (actionId === "dismiss" || actionId === "not_now") { recordDismissal(); return; }

        const view = action?.notification?.extra?.view;
        if (typeof view === "string" && view) {
          recordEngagement();
          recordNotificationOpen();
          go(view);
        }
      } catch (e) {
        console.error("[App] notification tap routing failed:", e);
      }
    })
      .then((h) => { handle = h; if (removed) h.remove(); })
      .catch((e) => console.error("[App] addListener(localNotificationActionPerformed) failed:", e));
    return () => { removed = true; handle?.remove(); };
  }, [go]);
}
