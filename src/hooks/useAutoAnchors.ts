import { useEffect } from "react";
import { recordFirstOpenToday, recordLastCloseToday } from "../services/autoAnchors";

/**
 * Records wake/bed time proxies for sleep tracking.
 * Extracted from App.tsx lines 274-280.
 */
export function useAutoAnchors(): void {
  useEffect(() => {
    recordFirstOpenToday();
    const handleVisibility = () => { if (document.visibilityState === "hidden") recordLastCloseToday(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", recordLastCloseToday);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); window.removeEventListener("beforeunload", recordLastCloseToday); };
  }, []);
}
