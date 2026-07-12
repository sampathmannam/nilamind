// Sensory comfort — a user-controlled "calm mode" for people who get overwhelmed by motion
// or bright visuals (common in anxiety/trauma, and a core manic-first / a11y concern). This is
// the REAL feature the Settings header promised ("sensory regulation") but which was never built —
// previously just a misleading label. It is independent of the OS "reduce motion" setting, so a
// person can ask for calm regardless of their system config. Stored on-device only.

import { secureLocal } from "./secureLocal";

const KEY = "nilamind_sensory_comfort";

export function getSensoryComfort(): boolean {
  try {
    return secureLocal.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setSensoryComfort(on: boolean): void {
  try {
    secureLocal.setItem(KEY, on ? "1" : "0");
  } catch {
    /* best-effort */
  }
}
