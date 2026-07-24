import { useEffect } from "react";
import { App as CapApp } from "@capacitor/app";
import { recordEngagement } from "../services/notificationBudget";
import type { NavApi } from "../services/navStore";

/**
 * Routes deep-links (nilamind://voice) to the correct tab.
 * Extracted from App.tsx lines 388-405.
 */
export function useDeepLinkRouter(go: NavApi["go"]): void {
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    CapApp.addListener("appUrlOpen", (data) => {
      try {
        const url = new URL(data.url);
        if (url.protocol === "nilamind:" && url.hostname === "voice") {
          recordEngagement();
          go("nila");
        }
      } catch (e) {
        console.error("[App] appUrlOpen routing failed:", e);
      }
    })
      .then((h) => { handle = h; if (removed) h.remove(); })
      .catch((e) => console.error("[App] addListener(appUrlOpen) failed:", e));
    return () => { removed = true; handle?.remove(); };
  }, [go]);
}
