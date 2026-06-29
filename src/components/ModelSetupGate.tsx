import { useSyncExternalStore } from "react";
import { subscribeBrain, getBrainStatus } from "../services/brainSetup";
import ModelSetupScreen from "./ModelSetupScreen";

// Self-contained first-run gate: renders the model-download screen when the on-device brain isn't set up
// (native, no Nano, no model on disk). Mounted once at the app root, like BiometricGateHost — so App.tsx
// only needs one line. When the download completes, setBrainStatus("ready") re-renders this away.
export default function ModelSetupGate() {
  const status = useSyncExternalStore(subscribeBrain, getBrainStatus, getBrainStatus);
  if (status !== "needs-setup") return null;
  return <ModelSetupScreen onReady={() => {}} />;
}
