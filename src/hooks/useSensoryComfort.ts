import { useEffect, useState } from "react";
import { getSensoryComfort, setSensoryComfort } from "../services/sensoryComfort";

/**
 * User-controlled "sensory comfort" calm mode. Returns the current flag plus a setter that
 * persists it and reflects it on <html> (class `sensory-comfort`) so the global CSS in
 * index.css can still the orb, kill ambient animation, and dim bright surfaces app-wide.
 */
export function useSensoryComfort(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => getSensoryComfort());

  useEffect(() => {
    const root = document.documentElement;
    if (on) root.classList.add("sensory-comfort");
    else root.classList.remove("sensory-comfort");
  }, [on]);

  const update = (v: boolean) => {
    setOn(v);
    setSensoryComfort(v);
  };

  return [on, update];
}
