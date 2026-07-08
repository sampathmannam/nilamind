// App.tsx — 3-tab IA (Nila / Tools / You) with aux-view routing.
// BiometricGateHost and ModelSetupGate are standalone gates (no children).

import { secureLocal, onPersistError } from "./services/secureLocal";
import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { App as CapApp } from "@capacitor/app";

// Eager — crisis path must never lazy-load
import CrisisOverlay from "./components/CrisisOverlay";
import GroundingLibraryScreen from "./components/GroundingLibraryScreen";
import ModeScreen from "./components/ModeScreen";
import ToolsScreen from "./components/ToolsScreen";
import YouScreen from "./components/YouScreen";

// LAZY — detail screens only when explicitly opened
const SettingsScreen = lazy(() => import("./components/SettingsScreen"));
const DashboardScreen = lazy(() => import("./components/DashboardScreen"));
const MedicationAdherenceScreen = lazy(() => import("./components/MedicationAdherenceScreen"));
const CaregiverShareScreen = lazy(() => import("./components/CaregiverShareScreen"));

// LAZY — aux view screens (module-scoped so lazy() runs once, not per render)
const ThoughtRecordScreen = lazy(() => import("./components/ThoughtRecordScreen"));
const AssessmentScreen = lazy(() => import("./components/AssessmentScreen"));
const ValuesToActionScreen = lazy(() => import("./components/ValuesToActionScreen"));
const SkillsLibraryScreen = lazy(() => import("./components/SkillsLibraryScreen"));
const YourDataScreen = lazy(() => import("./components/YourDataScreen"));
const WhyScreen = lazy(() => import("./components/WhyScreen"));
const NilaMemoryScreen = lazy(() => import("./components/NilaMemoryScreen"));
const WindDownScreen = lazy(() => import("./components/WindDownScreen"));
const ReachOutScreen = lazy(() => import("./components/ReachOutScreen"));
const PactScreen = lazy(() => import("./components/PactScreen"));
const LearnScreen = lazy(() => import("./components/LearnScreen"));
const CrisisRehearsalScreen = lazy(() => import("./components/CrisisRehearsalScreen"));
const PeerSupportScreen = lazy(() => import("./components/PeerSupportScreen"));
const ProblemSolvingScreen = lazy(() => import("./components/ProblemSolvingScreen"));
const ValuesWorkScreen = lazy(() => import("./components/ValuesWorkScreen"));
const ExposureHierarchyScreen = lazy(() => import("./components/ExposureHierarchyScreen"));
const RelapsePlanScreen = lazy(() => import("./components/RelapsePlanScreen"));
const EpisodeSupportScreen = lazy(() => import("./components/EpisodeSupportScreen"));

// Calm fallback while lazy chunks load
function ScreenFallback() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Loading">
      <span className="w-2.5 h-2.5 rounded-full bg-slate-500/70 animate-ping" />
    </div>
  );
}

import { syncDailyReminders } from "./services/notifications";
import { t } from "./services/i18n";
import { wakeWord } from "./services/wakeWord";
import { getWakeEnabled } from "./services/wakePrefs";
import ListeningIndicator from "./components/ListeningIndicator";
import BiometricGateHost from "./components/BiometricGateHost";
import ModelSetupGate from "./components/ModelSetupGate";
import OnboardingGate from "./components/OnboardingGate";
import { hasCompletedOnboarding } from "./services/onboarding";
import { resolveNavTarget, type AuxView, type TabView } from "./services/nav";
import { MessageSquare, LayoutGrid, User } from "lucide-react";
import SheetContainer from "./components/SheetContainer";

type AppTab = "nila" | "tools" | "you";

// ── Aux view label map for sheet headers ──
const AUX_LABELS: Partial<Record<AuxView, string>> = {
  thought_record: "Thought record",
  assessment: "Screenings",
  values_to_action: "Values to action",
  skills: "Skills library",
  your_data: "Your data",
  why: "Why we built this",
  nila_memory: "What Nila remembers",
  winddown: "Wind down",
  reach_out: "Reach out",
  pact: "PACT plan",
  learn: "Learn",
  crisis_rehearsal: "Crisis rehearsal",
  peer_support: "Peer support",
  problem_solving: "Problem solving",
  values_work: "Values work",
  exposure: "Exposure hierarchy",
  relapse_plan: "Relapse prevention",
  behaviour: "Phone patterns",
  episode: "Episode support",
};

function auxViewLabel(view: AuxView): string {
  return AUX_LABELS[view] ?? view;
}

// ── Aux view component renderers (module-scoped lazy imports — created once, not per render)
function renderAuxView(view: AuxView, onActivateCrisis: () => void, onClose: () => void, onOpenGrounding: () => void) {
  switch (view) {
    case "thought_record": return <ThoughtRecordScreen />;
    case "assessment": return <AssessmentScreen onActivateCrisis={onActivateCrisis} />;
    case "values_to_action": return <ValuesToActionScreen />;
    case "skills": return <SkillsLibraryScreen />;
    case "your_data": return <YourDataScreen />;
    case "why": return <WhyScreen />;
    case "nila_memory": return <NilaMemoryScreen />;
    case "winddown": return <WindDownScreen />;
    case "reach_out": return <ReachOutScreen />;
    case "pact": return <PactScreen />;
    case "learn": return <LearnScreen />;
    case "crisis_rehearsal": return <CrisisRehearsalScreen />;
    case "peer_support": return <PeerSupportScreen />;
    case "problem_solving": return <ProblemSolvingScreen />;
    case "values_work": return <ValuesWorkScreen />;
    case "exposure": return <ExposureHierarchyScreen />;
    case "relapse_plan": return <RelapsePlanScreen />;
    case "behaviour": return <DashboardScreen />;
    case "episode": return <EpisodeSupportScreen onSessionEnded={onClose} onNavigateToGrounding={() => { onClose(); onOpenGrounding(); }} onNavigateToBreathing={() => { onClose(); onOpenGrounding(); }} />;
    default: return <div className="p-6 text-slate-400 text-sm text-center">Not available</div>;
  }
}

export default function App() {
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isGroundingOpen, setIsGroundingOpen] = useState(false);
  const [isMedicationOpen, setIsMedicationOpen] = useState(false);
  const [isCaregiverOpen, setIsCaregiverOpen] = useState(false);
  const [activeAuxView, setActiveAuxView] = useState<AuxView | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("nila");
  const [disableAnchorPulse, setDisableAnchorPulse] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(hasCompletedOnboarding());
  const [wakeListening, setWakeListening] = useState(false);
  const [phoneEnabled] = useState(false);

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

  // Wake word integration
  useEffect(() => {
    const onWakeCb = () => { setWakeListening(false); };
    const handler = () => {
      if (getWakeEnabled()) {
        wakeWord.start(onWakeCb).then((ok) => setWakeListening(ok)).catch(() => setWakeListening(false));
      } else {
        void wakeWord.stop().then(() => setWakeListening(false));
      }
    };
    if (getWakeEnabled()) {
      wakeWord.start(onWakeCb).then((ok) => setWakeListening(ok)).catch(() => setWakeListening(false));
    }
    window.addEventListener("nilaWakePrefChanged", handler);
    return () => {
      window.removeEventListener("nilaWakePrefChanged", handler);
      void wakeWord.stop();
    };
  }, []);

  // ── Unified go() for Tools/You hub rows ──
  const go = useCallback((target: string) => {
    const res = resolveNavTarget(target);
    if (res.kind === "crisis") { setIsCrisisOpen(true); return; }
    if (res.kind === "plan") { setIsGroundingOpen(true); return; }
    if (res.kind === "tab") {
      // "diary" and "plan" are logical tabs that map to Nila or sheets, not our 3-tab bar.
      // Route them to Nila so the chat prompt handles them.
      if (res.tab === "plan") { setIsGroundingOpen(true); return; }
      if (res.tab === "nila" || res.tab === "tools" || res.tab === "you") {
        setActiveTab(res.tab as AppTab);
        return;
      }
      // diary → Nila tab (the check-in handles it)
      setActiveTab("nila");
      return;
    }
    if (res.kind === "aux") {
      if (res.view === "settings") { setIsSettingsOpen(true); return; }
      if (res.view === "dashboard") { setIsDashboardOpen(true); return; }
      if (res.view === "medication") { setIsMedicationOpen(true); return; }
      if (res.view === "caregiver") { setIsCaregiverOpen(true); return; }
      setActiveAuxView(res.view);
    }
    // "caregiver" and other special targets — route to the right sheet
    if (res.kind === "unknown") {
      if (res.target === "caregiver") { setIsCaregiverOpen(true); return; }
      if (res.target === "grounding" || res.target === "breathing") { setIsGroundingOpen(true); return; }
    }
  }, []);

  const onEpisode = useCallback(() => go("episode"), [go]);

  // Android hardware back button
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    CapApp.addListener("backButton", () => {
      if (isCrisisOpen) { setIsCrisisOpen(false); return; }
      if (isSettingsOpen) { setIsSettingsOpen(false); return; }
      if (isDashboardOpen) { setIsDashboardOpen(false); return; }
      if (isGroundingOpen) { setIsGroundingOpen(false); return; }
      if (isMedicationOpen) { setIsMedicationOpen(false); return; }
      if (isCaregiverOpen) { setIsCaregiverOpen(false); return; }
      if (activeAuxView) { setActiveAuxView(null); return; }
      if (activeTab !== "nila") { setActiveTab("nila"); return; }
      void CapApp.exitApp();
    }).then((h) => { handle = h; if (removed) h.remove(); });
    return () => { removed = true; handle?.remove(); };
  }, [isCrisisOpen, isSettingsOpen, isDashboardOpen, isGroundingOpen, isMedicationOpen, isCaregiverOpen, activeAuxView, activeTab]);

  return (
    <div className="relative isolate h-dvh bg-page text-slate-300 font-sans antialiased overflow-hidden flex flex-col">
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
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-start gap-2 text-[11px] text-amber-200/90 z-40 shrink-0" id="save-warning">
          <span className="font-semibold text-amber-300">Save issue:</span>
          <span>Some changes couldn't be saved.</span>
          <button onClick={() => setSaveWarning(false)} className="ml-auto text-amber-400 hover:text-amber-200 cursor-pointer">Dismiss</button>
        </div>
      )}

      {/* Listening indicator (wake word) */}
      <ListeningIndicator active={wakeListening} onClick={() => setIsSettingsOpen(true)} />

      {/* Main content area */}
      <main className="flex-1 min-h-0 relative flex flex-col animate-tab-fade" key={activeTab}>
        {activeTab === "nila" && (
          <ModeScreen
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenCrisis={() => setIsCrisisOpen(true)}
            onOpenDashboard={() => setIsDashboardOpen(true)}
            onOpenMedication={() => setIsMedicationOpen(true)}
            onOpenGrounding={() => setIsGroundingOpen(true)}
          />
        )}
        {activeTab === "tools" && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ToolsScreen go={go} phoneEnabled={phoneEnabled} onEpisode={onEpisode} />
          </div>
        )}
        {activeTab === "you" && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <YouScreen go={go} />
          </div>
        )}
      </main>

      {/* Bottom tab bar */}
      <nav className="shrink-0 flex items-center justify-around border-t border-slate-800 bg-page/95 backdrop-blur pb-[max(8px,env(safe-area-inset-bottom))]" aria-label="Main navigation">
        {([
          { id: "nila" as AppTab, label: "Nila", Icon: MessageSquare },
          { id: "tools" as AppTab, label: t("tools"), Icon: LayoutGrid },
          { id: "you" as AppTab, label: t("you"), Icon: User },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors cursor-pointer ${
              activeTab === id ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            }`}
            aria-label={label}
            aria-selected={activeTab === id}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>

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
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="grounding-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">Grounding</span>
            <button onClick={() => setIsGroundingOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <GroundingLibraryScreen />
          </div>
        </div>
      )}

      {/* Settings sheet */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="settings-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">{t("settings")}</span>
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Suspense fallback={<ScreenFallback />}>
              <SettingsScreen disableAnchorPulse={disableAnchorPulse} onTogglePulse={(val) => setDisableAnchorPulse(val)} onOpenCaregiver={() => setIsCaregiverOpen(true)} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Dashboard sheet */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="dashboard-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">{t("dashboard")}</span>
            <button onClick={() => setIsDashboardOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Suspense fallback={<ScreenFallback />}><DashboardScreen /></Suspense>
          </div>
        </div>
      )}

      {/* Medication sheet */}
      {isMedicationOpen && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="medication-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">{t("medications")}</span>
            <button onClick={() => setIsMedicationOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <Suspense fallback={<ScreenFallback />}><MedicationAdherenceScreen /></Suspense>
          </div>
        </div>
      )}

      {/* Caregiver sheet */}
      {isCaregiverOpen && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="caregiver-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">Share with a trusted person</span>
            <button onClick={() => setIsCaregiverOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <Suspense fallback={<ScreenFallback />}><CaregiverShareScreen /></Suspense>
          </div>
        </div>
      )}

      {/* Generic aux view sheet — all other screens */}
      {activeAuxView && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="aux-view-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">{auxViewLabel(activeAuxView)}</span>
            <button onClick={() => setActiveAuxView(null)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center">✕</button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Suspense fallback={<ScreenFallback />}>{renderAuxView(activeAuxView, () => setIsCrisisOpen(true), () => setActiveAuxView(null), () => setIsGroundingOpen(true))}</Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
