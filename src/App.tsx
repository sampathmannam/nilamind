// App.tsx — Simplified: ModeScreen is the single home interface.
// BiometricGateHost and ModelSetupGate are standalone gates (no children).

import { secureLocal, onPersistError } from "./services/secureLocal";
import React, { useState, useEffect, lazy, Suspense } from "react";
import { App as CapApp } from "@capacitor/app";

// Eager — crisis path must never lazy-load
import CrisisOverlay from "./components/CrisisOverlay";
import GroundingLibraryScreen from "./components/GroundingLibraryScreen";
import ModeScreen from "./components/ModeScreen";

// LAZY — detail screens only when explicitly opened
const SettingsScreen = lazy(() => import("./components/SettingsScreen"));
const DashboardScreen = lazy(() => import("./components/DashboardScreen"));

// Calm fallback while lazy chunks load
function ScreenFallback() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Loading">
      <span className="w-2.5 h-2.5 rounded-full bg-slate-500/70 animate-ping" />
    </div>
  );
}

import { syncDailyReminders } from "./services/notifications";
import ListeningIndicator from "./components/ListeningIndicator";
import BiometricGateHost from "./components/BiometricGateHost";
import ModelSetupGate from "./components/ModelSetupGate";
import OnboardingGate from "./components/OnboardingGate";
import { hasCompletedOnboarding } from "./services/onboarding";

export default function App() {
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isGroundingOpen, setIsGroundingOpen] = useState(false);
  const [disableAnchorPulse, setDisableAnchorPulse] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(hasCompletedOnboarding());

  useEffect(() => onPersistError((failingKeys) => setSaveWarning(failingKeys.length > 0)), []);

  // Load saved animation preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nilamind_disable_anchor_pulse");
      if (saved === "true") setDisableAnchorPulse(true);
    } catch { /* ignore */ }
  }, []);

  // Sync daily reminders
  useEffect(() => {
    void syncDailyReminders();
  }, []);

  // Android hardware back button
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    CapApp.addListener("backButton", () => {
      if (isCrisisOpen) { setIsCrisisOpen(false); return; }
      if (isSettingsOpen) { setIsSettingsOpen(false); return; }
      if (isDashboardOpen) { setIsDashboardOpen(false); return; }
      if (isGroundingOpen) { setIsGroundingOpen(false); return; }
      void CapApp.exitApp();
    }).then((h) => { handle = h; if (removed) h.remove(); });
    return () => { removed = true; handle?.remove(); };
  }, [isCrisisOpen, isSettingsOpen, isDashboardOpen, isGroundingOpen]);

  return (
    <div className="relative isolate min-h-screen bg-page text-slate-300 font-sans antialiased overflow-x-hidden">
      {/* Living aurora atmosphere */}
      <div className="aurora-field" aria-hidden="true" />

      {/* Biometric gate — standalone, renders itself */}
      <BiometricGateHost />

      {/* Model setup gate — standalone, renders itself */}
      <ModelSetupGate />

      {/* First-run onboarding — skip available, crisis always reachable */}
      {!onboardingDone && (
        <OnboardingGate
          onComplete={() => setOnboardingDone(true)}
          onOpenCrisis={() => setIsCrisisOpen(true)}
        />
      )}

      {/* Confidentiality notice */}
      {saveWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-start gap-2 text-[11px] text-amber-200/90 z-40" id="save-warning">
          <span className="font-semibold text-amber-300">Save issue:</span>
          <span>Some changes couldn't be saved.</span>
          <button onClick={() => setSaveWarning(false)} className="ml-auto text-amber-400 hover:text-amber-200 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Listening indicator (wake word) */}
      <ListeningIndicator active={false} onClick={() => {}} />

      {/* Main content — ModeScreen is the single home */}
      <main className="relative flex flex-col min-h-screen">
        <ModeScreen
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenCrisis={() => setIsCrisisOpen(true)}
          onOpenDashboard={() => setIsDashboardOpen(true)}
        />
      </main>

      {/* Crisis overlay */}
      {isCrisisOpen && (
        <CrisisOverlay
          isOpen={isCrisisOpen}
          onClose={() => setIsCrisisOpen(false)}
          onNavigateToGrounding={() => { setIsCrisisOpen(false); setIsGroundingOpen(true); }}
          onNavigateToBreathing={() => { setIsCrisisOpen(false); setIsGroundingOpen(true); }}
        />
      )}

      {/* Grounding library */}
      {isGroundingOpen && (
        <div className="fixed inset-0 z-50 bg-page" id="grounding-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">Grounding</span>
            <button
              onClick={() => setIsGroundingOpen(false)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto">
            <GroundingLibraryScreen />
          </div>
        </div>
      )}

      {/* Settings sheet */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-page" id="settings-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">Settings</span>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto">
            <Suspense fallback={<ScreenFallback />}>
              <SettingsScreen
                disableAnchorPulse={disableAnchorPulse}
                onTogglePulse={(val) => setDisableAnchorPulse(val)}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Dashboard sheet */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-50 bg-page" id="dashboard-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">Your Dashboard</span>
            <button
              onClick={() => setIsDashboardOpen(false)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="overflow-y-auto">
            <Suspense fallback={<ScreenFallback />}>
              <DashboardScreen />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
