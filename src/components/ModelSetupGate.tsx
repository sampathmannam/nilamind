import { useSyncExternalStore, useState, useEffect } from "react";
import { subscribeBrain, getBrainStatus } from "../services/brainSetup";
import { hasCompletedOnboarding, ONBOARDING_DONE_EVENT } from "../services/onboarding";
import ModelSetupScreen from "./ModelSetupScreen";

// Self-contained first-run gate: renders the model-download screen when the on-device brain isn't set up
// (native, no Nano, no model on disk). Mounted once at the app root, like BiometricGateHost — so App.tsx
// only needs one line. When the download completes, setBrainStatus("ready") re-renders this away.
//
// IMPORTANT: waits for onboarding to complete before rendering. Without this, the async model-check in
// main.tsx resolves and calls setBrainStatus("needs-setup") while OnboardingGate is mid-slide — both
// are z-60 fixed overlays and the download screen slams over the onboarding. By gating on onboardingDone,
// the user meets Nila first, then sees the download screen after onboarding completes.
export default function ModelSetupGate() {
  const status = useSyncExternalStore(subscribeBrain, getBrainStatus, getBrainStatus);
  const [onboardingDone, setOnboardingDone] = useState(hasCompletedOnboarding());

  useEffect(() => {
    if (onboardingDone) return; // already done, no listener needed
    const handler = () => setOnboardingDone(true);
    window.addEventListener(ONBOARDING_DONE_EVENT, handler);
    return () => window.removeEventListener(ONBOARDING_DONE_EVENT, handler);
  }, [onboardingDone]);

  if (status !== "needs-setup" || !onboardingDone) return null;
  return <ModelSetupScreen onReady={() => {}} />;
}
