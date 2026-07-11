// App.tsx — 3-tab IA (Nila / Tools / You) with aux-view routing.
// BiometricGateHost and ModelSetupGate are standalone gates (no children).

import { secureLocal, onPersistError } from "./services/secureLocal";
import React, { useState, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { App as CapApp } from "@capacitor/app";
import { useReducedMotion } from "./hooks/useReducedMotion";

// Eager — crisis path must never lazy-load
import CrisisOverlay from "./components/CrisisOverlay";
import CrisisPill from "./components/CrisisPill";
import GroundingLibraryScreen from "./components/GroundingLibraryScreen";
import ModeScreen from "./components/ModeScreen";
import TodayScreen from "./components/TodayScreen";
import YouScreen from "./components/YouScreen";
import ErrorBoundary from "./components/ErrorBoundary";

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
const SocialRhythmScreen = lazy(() => import("./components/SocialRhythmScreen"));
// #21 (audit): module-scoped so it isn't re-created on every App render (which remounted DiaryCardScreen,
// flashed Suspense, and discarded the user's unsaved emotion sliders / notes on any parent state change).
const DiaryCardScreen = lazy(() => import("./components/DiaryCardScreen"));
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
const EmaCheckInScreen = lazy(() => import("./components/EmaCheckIn"));
const ArmedCheckInScreen = lazy(() => import("./components/ArmedCheckInScreen"));
const AboutNilaScreen = lazy(() => import("./components/AboutNilaScreen"));

// Calm fallback while lazy chunks load
import { Skeleton, SkeletonCard, SkeletonList, SkeletonChart } from "./components/Skeleton";

function ScreenFallback() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonList count={2} />
    </div>
  );
}

import { syncDailyReminders, scheduleReminderAt, syncEmaCheckins, suppressNudgesForCrisis } from "./services/notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { t, LANGUAGE_CHANGED_EVENT } from "./services/i18n";
import { wakeWord } from "./services/wakeWord";
import { getWakeEnabled } from "./services/wakePrefs";
import ListeningIndicator from "./components/ListeningIndicator";
import BiometricGateHost from "./components/BiometricGateHost";
import ModelSetupGate from "./components/ModelSetupGate";
import OnboardingGate from "./components/OnboardingGate";
import { hasCompletedOnboarding } from "./services/onboarding";
import { resolveNavTarget, type AuxView, type TabView } from "./services/nav";
import { getArmedCheckin, armedCheckinBody } from "./services/armedCheckin";
import { recordAppOpen } from "./services/retentionMetrics";
import { getPilotState, markEndpointReminderScheduled, PILOT_ENDPOINT_REMINDER_BODY } from "./services/pilotStudy";
import { MessageSquare, LayoutGrid, User, X } from "lucide-react";
import SheetContainer from "./components/SheetContainer";
import { hapticLight } from "./hooks/useHaptics";

type AppTab = "nila" | "today" | "you";

// ── Aux view label map for sheet headers ──
const AUX_LABELS: Partial<Record<AuxView, string>> = {
  about_nila: "About Nila",
  thought_record: "Thought record",
  assessment: "Screenings",
  values_to_action: "Values to action",
  skills: "Skills library",
  your_data: "Your data",
  why: "Why we built this",
  nila_memory: "What Nila remembers",
  winddown: "Wind down",
  social_rhythm: "Social rhythm",
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
  diary: "Diary card",
  episode: "Episode support",
  armed_checkin: "Armed check‑in",
  ema_checkin: "Quick check‑in",
};

function auxViewLabel(view: AuxView): string {
  return AUX_LABELS[view] ?? view;
}

// ── Aux view component renderers (module-scoped lazy imports — created once, not per render)
function renderAuxView(view: AuxView, onActivateCrisis: () => void, onClose: () => void, onOpenGrounding: () => void) {
  switch (view) {
    case "about_nila": return <AboutNilaScreen />;
    case "thought_record": return <ThoughtRecordScreen />;
    case "assessment": return <AssessmentScreen onActivateCrisis={onActivateCrisis} />;
    case "values_to_action": return <ValuesToActionScreen />;
    case "skills": return <SkillsLibraryScreen />;
    case "your_data": return <YourDataScreen />;
    case "why": return <WhyScreen />;
    case "nila_memory": return <NilaMemoryScreen />;
    case "winddown": return <WindDownScreen />;
    case "social_rhythm": return <SocialRhythmScreen />;
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
    case "diary": return <DiaryCardScreen />;
    case "episode": return <EpisodeSupportScreen onSessionEnded={onClose} onNavigateToGrounding={() => { onClose(); onOpenGrounding(); }} onNavigateToBreathing={() => { onClose(); onOpenGrounding(); }} />;
    case "armed_checkin": return <ArmedCheckInScreen onClose={onClose} />;
    case "ema_checkin": return <EmaCheckInScreen onCrisis={() => { onClose(); onActivateCrisis(); }} />;
    default: return <div className="p-6 text-slate-400 text-sm text-center">Not available</div>;
  }
}

export default function App() {
  const prefersReduced = useReducedMotion();
  const [isCrisisOpen, setIsCrisisOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isGroundingOpen, setIsGroundingOpen] = useState(false);
  const [groundingExpandIndex, setGroundingExpandIndex] = useState<number | undefined>(undefined);
  const [isMedicationOpen, setIsMedicationOpen] = useState(false);
  const [isCaregiverOpen, setIsCaregiverOpen] = useState(false);
  const [activeAuxView, setActiveAuxView] = useState<AuxView | null>(null);
  const [closingAuxView, setClosingAuxView] = useState<AuxView | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>("today");
  const [disableAnchorPulse, setDisableAnchorPulse] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(hasCompletedOnboarding());
  const [wakeListening, setWakeListening] = useState(false);
  const [phoneEnabled] = useState(false);
  const [modeScreenHasSheet, setModeScreenHasSheet] = useState(false);
  const [, setLangTick] = useState(0);
  const closeSheet = useCallback((view: AuxView | null) => {
    if (!view) return;
    setClosingAuxView(view);
    setActiveAuxView(null);
    setTimeout(() => setClosingAuxView(null), 200);
  }, []);

  const closeActiveAux = useCallback(() => {
    if (activeAuxView) closeSheet(activeAuxView);
  }, [activeAuxView, closeSheet]);

  useEffect(() => onPersistError((failingKeys) => setSaveWarning(failingKeys.length > 0)), []);

  // audit 2.23 — re-render the whole app when the language changes so translated strings update immediately.
  useEffect(() => {
    const h = () => setLangTick((n) => n + 1);
    window.addEventListener(LANGUAGE_CHANGED_EVENT, h);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, h);
  }, []);

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

  // Record that the app was opened today (on-device retention instrumentation). Runs after SecureGate has
  // hydrated the encrypted store; idempotent per calendar day, so StrictMode's double mount-effect is safe.
  // Nothing is sent anywhere — the metric only leaves the device via the user-initiated export.
  useEffect(() => {
    recordAppOpen();
  }, []);

  // If enrolled in the opt-in research pilot, schedule the single endpoint check-in reminder once. The body
  // is content-free (routes to the assessment view). No-op for everyone not enrolled.
  useEffect(() => {
    const p = getPilotState();
    if (p?.enrolled && !p.endpointReminderScheduled) {
      void scheduleReminderAt(new Date(`${p.endpointDueDay}T10:00:00`), PILOT_ENDPOINT_REMINDER_BODY, "NilaMind", { view: "assessment" })
        .then((r) => { if (r.ok) markEndpointReminderScheduled(); });
    }
  }, []);

  // Re-roll EMA quick-check-in pings on every app open. Never prompts on startup; syncEmaCheckins bails if
  // EMA is off, permission-denied, in quiet hours, or a crisis/elevation suppression window is active.
  useEffect(() => {
    void syncEmaCheckins({ request: false });
  }, []);

  // Schedule any pending armed check‑in as a notification on app start.
  // re-audit #2 (privacy): the notification body is the CONTENT-FREE armedCheckinBody() — never
  // armedCheckinPrompt(), which embeds the user's own words. A lock-screen must not leak a mental-health
  // disclosure (mirrors notifications.ts notifyReplyReady). The private context stays inside the app.
  useEffect(() => {
    const entry = getArmedCheckin();
    if (entry) {
      void scheduleReminderAt(new Date(entry.triggerAt), armedCheckinBody(), "NilaMind", { view: "armed_checkin" });
    }
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

  // Opening the crisis surface also latches a 24h no-nudge window and yanks any queued EMA pings —
  // you never push a "how are you right now?" to someone mid-crisis (FEATURES_PLAN P6.4).
  const activateCrisis = useCallback(() => {
    void suppressNudgesForCrisis(); // latch 24h no-nudge + yank queued EMA/daily pings
    setIsCrisisOpen(true);
  }, []);

  // ── Unified go() for Tools/You hub rows ──
  const go = useCallback((target: string) => {
    const res = resolveNavTarget(target);
    if (res.kind === "crisis") { activateCrisis(); return; }
    if (res.kind === "plan") { setIsGroundingOpen(true); return; }
    if (res.kind === "tab") {
      // "diary" and "plan" are logical tabs that map to Nila or sheets, not our 3-tab bar.
      // Route them to Nila so the chat prompt handles them.
      if (res.tab === "plan") { setIsGroundingOpen(true); return; }
      if (res.tab === "nila" || res.tab === "today" || res.tab === "you") {
        setActiveTab(res.tab as AppTab);
        return;
      }
      // diary → open diary card screen via aux view
      if (res.tab === "diary") { setActiveAuxView("diary" as AuxView); return; }
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
  }, [activateCrisis]);

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
      if (modeScreenHasSheet) { setModeScreenHasSheet(false); return; }
      if (activeTab !== "nila") { setActiveTab("nila"); return; }
      void CapApp.exitApp();
    }).then((h) => { handle = h; if (removed) h.remove(); });
    return () => { removed = true; handle?.remove(); };
  }, [isCrisisOpen, isSettingsOpen, isDashboardOpen, isGroundingOpen, isMedicationOpen, isCaregiverOpen, activeAuxView, activeTab, modeScreenHasSheet]);

  // Route a tapped local notification to its screen via the existing go() router. Fires for EVERY tapped
  // notification (daily/med/armed/ema); we route ONLY on a recognised content-free {view} payload and no-op
  // otherwise (the OS already foregrounds the app). go() self-validates the target via resolveNavTarget.
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      try {
        const view = action?.notification?.extra?.view;
        if (typeof view === "string" && view) go(view);
      } catch (e) {
        console.error("[App] notification tap routing failed:", e);
      }
    })
      .then((h) => { handle = h; if (removed) h.remove(); })
      .catch((e) => console.error("[App] addListener(localNotificationActionPerformed) failed:", e));
    return () => { removed = true; handle?.remove(); };
  }, [go]);

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
          onOpenCrisis={activateCrisis}
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

      {/* Main content area — each tab isolated in its own ErrorBoundary so one tab crashing
          can't take down the others (redesign §5: localized failure). */}
      <main className="flex-1 min-h-0 relative flex flex-col animate-tab-fade" key={activeTab}>
        {activeTab === "nila" && (
          <ErrorBoundary name="nila" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:nila] caught:", err, info)}>
            <ModeScreen
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenCrisis={activateCrisis}
              onOpenDashboard={() => setIsDashboardOpen(true)}
              onOpenMedication={() => setIsMedicationOpen(true)}
              onOpenGrounding={(idx) => { setIsGroundingOpen(true); setGroundingExpandIndex(idx); }}
              onOpenDiary={() => setActiveAuxView("diary" as AuxView)}
              onOpenReachOut={() => setActiveAuxView("reach_out" as AuxView)}
              onOpenWindDown={() => setActiveAuxView("winddown" as AuxView)}
              onInternalSheetChange={(open) => setModeScreenHasSheet(open)}
            />
          </ErrorBoundary>
        )}
        {activeTab === "today" && (
          <ErrorBoundary name="today" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:today] caught:", err, info)}>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
              <TodayScreen go={go} phoneEnabled={phoneEnabled} onEpisode={onEpisode} />
            </div>
          </ErrorBoundary>
        )}
        {activeTab === "you" && (
          <ErrorBoundary name="you" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:you] caught:", err, info)}>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
              <YouScreen go={go} />
            </div>
          </ErrorBoundary>
        )}
      </main>

      {/* Persistent crisis affordance — rendered on EVERY tab (§9: crisis always reachable). It sits in
          the shell's bottom stack, outside every activeTab branch, so it can't collide with ModeScreen's
          chat input (which lives inside <main>). The nav's border-t below separates it from the 3 tabs so
          it never reads as a routine destination (ui-ux-pro-max destructive-nav-separation). */}
      <div className="shrink-0 px-4 pt-2 pb-1 bg-page" id="shell-crisis-row">
        <CrisisPill onActivate={activateCrisis} />
      </div>

      {/* Bottom tab bar */}
      <nav className="shrink-0 flex items-center justify-around border-t border-slate-800 bg-page/95 backdrop-blur pb-[max(8px,env(safe-area-inset-bottom))]" role="tablist" aria-label="Main navigation">
        {([
          { id: "nila" as AppTab, label: "Nila", Icon: MessageSquare },
          { id: "today" as AppTab, label: "Today", Icon: LayoutGrid },
          { id: "you" as AppTab, label: t("you"), Icon: User },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            onClick={() => { setActiveTab(id); hapticLight(); }}
            className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] ${
              activeTab === id ? "text-blue-400" : "text-slate-500 hover:text-slate-300"
            }`}
            aria-label={label}
            aria-selected={activeTab === id}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>

      {/* Crisis overlay */}
      {isCrisisOpen && (
        <div className="animate-slide-in">
          <CrisisOverlay
            isOpen={isCrisisOpen}
            onClose={() => setIsCrisisOpen(false)}
            onNavigateToGrounding={() => { setIsCrisisOpen(false); setIsGroundingOpen(true); }}
            onNavigateToBreathing={() => { setIsCrisisOpen(false); setIsGroundingOpen(true); }}
          />
        </div>
      )}

       {/* Grounding library */}
      {isGroundingOpen && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="grounding-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">Grounding</span>
            <button onClick={() => { setIsGroundingOpen(false); setGroundingExpandIndex(undefined); }} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" aria-hidden="true" /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <GroundingLibraryScreen autoExpand={groundingExpandIndex} />
          </div>
        </div>
      )}

      {/* Settings sheet */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="settings-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">{t("settings")}</span>
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" aria-hidden="true" /></button>
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
            <button onClick={() => setIsDashboardOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" aria-hidden="true" /></button>
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
            <button onClick={() => setIsMedicationOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" aria-hidden="true" /></button>
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
            <button onClick={() => setIsCaregiverOpen(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" aria-hidden="true" /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <Suspense fallback={<ScreenFallback />}><CaregiverShareScreen /></Suspense>
          </div>
        </div>
      )}

      {/* Generic aux view sheet — all other screens */}
      {(activeAuxView || closingAuxView) && (
        <div className={`fixed inset-0 z-50 bg-page flex flex-col ${closingAuxView ? "animate-slide-out" : "animate-slide-in"}`} id="aux-view-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">{auxViewLabel(activeAuxView || closingAuxView!)}</span>
            <button onClick={() => closeSheet(activeAuxView)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Close"><X className="w-4 h-4" aria-hidden="true" /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Suspense fallback={<ScreenFallback />}>{renderAuxView((activeAuxView || closingAuxView)!, activateCrisis, closeActiveAux, () => setIsGroundingOpen(true))}</Suspense>
          </div>
        </div>
      )}
    </div>
  );
}
