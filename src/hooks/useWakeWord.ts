import { useEffect, useState } from "react";
import { wakeWord } from "../services/wakeWord";
import { getWakeEnabled } from "../services/wakePrefs";

/**
 * Manages wake-word listening lifecycle.
 * Extracted from App.tsx lines 298-307.
 */
export function useWakeWord(): boolean {
  const [wakeListening, setWakeListening] = useState(false);

  useEffect(() => {
    const onWakeCb = () => { setWakeListening(false); };
    const handler = () => {
      if (getWakeEnabled()) { wakeWord.start(onWakeCb).then((ok) => setWakeListening(ok)).catch(() => setWakeListening(false)); }
      else { void wakeWord.stop().then(() => setWakeListening(false)); }
    };
    if (getWakeEnabled()) { wakeWord.start(onWakeCb).then((ok) => setWakeListening(ok)).catch(() => setWakeListening(false)); }
    window.addEventListener("nilaWakePrefChanged", handler);
    return () => { window.removeEventListener("nilaWakePrefChanged", handler); void wakeWord.stop(); };
  }, []);

  return wakeListening;
}
