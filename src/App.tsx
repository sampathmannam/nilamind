// App.tsx — 3-tab IA (Nila / Today / You) with nav-store-driven overlays.
// BiometricGateHost and ModelSetupGate are standalone gates (no children).

import { onPersistError } from "./services/secureLocal";
import { onError } from "./services/errorReporter";
import ErrorDisplay from "./components/ErrorDisplay";
import React, { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { App as CapApp } from "@capacitor/app";
import { useReducedMotion } from "./hooks/useReducedMotion";

// Eager — crisis path must never lazy-load
import CrisisOverlay from "./components/CrisisOverlay";
import GroundingLibraryScreen from "./components/GroundingLibraryScreen";
import ModeScreen from "./components/ModeScreen";
import TodayScreen from "./components/TodayScreen";
import ToolsScreen from "./components/ToolsScreen";
import YouScreen from "./components/YouScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import Sheet from "./components/Sheet";

// LAZY — detail screens only when explicitly opened
const SettingsScreen = lazy(() => import("./components/SettingsScreen"));
const DashboardScreen = lazy(() => import("./components/DashboardScreen"));
const MedicationAdherenceScreen = lazy(() => import("./components/MedicationAdherenceScreen"));
const CaregiverShareScreen = lazy(() => import("./components/CaregiverShareScreen"));

// LAZY — aux view screens (module-scoped so lazy() runs once, not per render)
const ThoughtRecordScreen = lazy(() => import("./components/ThoughtRecordScreen"));
const AssessmentScreen = lazy(() => import("./components/AssessmentScreen"));
const YourDataScreen = lazy(() => import("./components/YourDataScreen"));
const ProgressDashboard = lazy(() => import("./components/ProgressDashboard"));
const NilaMemoryScreen = lazy(() => import("./components/NilaMemoryScreen"));
const WindDownScreen = lazy(() => import("./components/WindDownScreen"));
const SocialRhythmScreen = lazy(() => import("./components/SocialRhythmScreen"));
// #21 (audit): module-scoped so it isn't re-created on every App render (which remounted DiaryCardScreen,
// flashed Suspense, and discarded the user's unsaved emotion sliders / notes on any parent state change).
const DiaryCardScreen = lazy(() => import("./components/DiaryCardScreen"));
const JournalScreen = lazy(() => import("./components/JournalScreen"));
const ReachOutScreen = lazy(() => import("./components/ReachOutScreen"));
const LearnScreen = lazy(() => import("./components/LearnScreen"));
const ProblemSolvingScreen = lazy(() => import("./components/ProblemSolvingScreen"));
const ValuesToActionScreen = lazy(() => import("./components/ValuesToActionScreen"));
const ExposureHierarchyScreen = lazy(() => import("./components/ExposureHierarchyScreen"));
const RelapsePlanScreen = lazy(() => import("./components/RelapsePlanScreen"));
const EpisodeSupportScreen = lazy(() => import("./components/EpisodeSupportScreen"));
const EmaCheckInScreen = lazy(() => import("./components/EmaCheckIn"));
const EpisodeMarkerScreen = lazy(() => import("./components/EpisodeMarkerScreen"));
const CaregiverSettingsScreen = lazy(() => import("./components/CaregiverSettingsScreen"));
const BreathingScreen = lazy(() => import("./components/BreathingScreen"));
const SoundPlayer = lazy(() => import("./components/SoundPlayer"));
const AboutNilaScreen = lazy(() => import("./components/AboutNilaScreen"));
const LegalScreen = lazy(() => import("./components/LegalScreen"));
const InsightsScreen = lazy(() => import("./components/InsightsScreen"));

// Calm fallback while lazy chunks load
import { SkeletonCard, SkeletonList } from "./components/Skeleton";

function ScreenFallback() {
  return (
    <div className="p-4 space-y-4" role="status" aria-label="Loading">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonList count={2} />
    </div>
  );
}

import { syncDailyReminders, scheduleReminderAt, syncEmaCheckins, syncWeeklyDigest, suppressNudgesForCrisis, registerNotificationActionTypes, syncWindDownReminder, syncMedicationReminders, syncInsightNotification } from "./services/notifications";
import { recordFirstOpenToday, recordLastCloseToday } from "./services/autoAnchors";
import { recordEngagement, recordDismissal } from "./services/notificationBudget";
import { recordNotificationOpen } from "./services/notificationEngagement";
import { enableDndFor } from "./services/dnd";
import { logMedication, loadMedications } from "./services/medicationAdherence";
import { LocalNotifications } from "@capacitor/local-notifications";
import { t, LANGUAGE_CHANGED_EVENT } from "./services/i18n";
import { wakeWord } from "./services/wakeWord";
import { getWakeEnabled } from "./services/wakePrefs";
import ListeningIndicator from "./components/ListeningIndicator";
import BiometricGateHost from "./components/BiometricGateHost";
import ModelSetupGate from "./components/ModelSetupGate";
import OnboardingGate from "./components/OnboardingGate";
import SafetyPlanScreen from "./components/SafetyPlanScreen";
import GuidedProgramsScreen from "./components/GuidedProgramsScreen";
import { startProtocolChat } from "./services/protocolChat";
import { getSessionChat, setSessionChat } from "./services/sessionChat";
import { hasCompletedOnboarding } from "./services/onboarding";
import { type AuxView } from "./services/nav";

import { recordAppOpen } from "./services/retentionMetrics";
import { recordPositiveSession } from "./services/ratingPrompt";
import { getPilotState, markEndpointReminderScheduled, PILOT_ENDPOINT_REMINDER_BODY } from "./services/pilotStudy";
import { getUserState } from "./services/modeEngine";
import { computeAdaptiveMode, getAdaptiveCssClass } from "./services/adaptiveTheme";
import { warmVoskStt } from "./services/voskStt";
import { MessageSquare, LayoutGrid, Wrench, User } from "lucide-react";

import { hapticLight } from "./hooks/useHaptics";

// Navigation store
import { NavProvider, useNav, hasOverlay, topOverlay, type NavApi, type SheetId, type AppTab } from "./services/navStore";

// ── Aux view label map for sheet headers ──
const AUX_LABELS: Partial<Record<AuxView, string>> = {
  about_nila: "About Nila",
  insights: "Your patterns",
  thought_record: "Thought record",
  assessment: "Screenings",
  your_data: "Your data",
  nila_memory: "What Nila remembers",
  winddown: "Wind down",
  social_rhythm: "Social rhythm",
  reach_out: "Reach out",
  learn: "Learn",
  problem_solving: "Problem solving",
  values_work: "Values work",
  values_to_action: "Values work",
  exposure: "Exposure hierarchy",
  relapse_plan: "Relapse prevention",
  behaviour: "Phone patterns",
  diary: "Journal",
  dbt_diary_card: "DBT diary card",
  episode: "Episode support",
  ema_checkin: "Quick check‑in",
  episode_marker: "Episode markers",
  caregiver_settings: "Caregiver settings",
  legal: "Legal",
  sounds: "Ambient sounds",
  safety_plan: "My Safety Plan",
  guided_programs: "Guided Programs",
  progress: "Your progress",
};

function auxViewLabel(view: AuxView): string {
  return AUX_LABELS[view] ?? view;
}

// ── Aux view component renderers (module-scoped lazy imports — created once, not per render)
function renderAuxView(view: AuxView, onActivateCrisis: () => void, onClose: () => void, onOpenGrounding: () => void, onOpenView: (target: string) => void, onOpenCaregiverShare?: (contactId: string) => void) {
  switch (view) {
    case "about_nila": return <AboutNilaScreen />;
    case "insights": return <InsightsScreen onClose={onClose} />;
    case "thought_record": return <ThoughtRecordScreen />;
    case "assessment": return <AssessmentScreen onActivateCrisis={onActivateCrisis} />;
    case "your_data": return <YourDataScreen />;
    case "nila_memory": return <NilaMemoryScreen />;
    case "winddown": return <WindDownScreen />;
    case "social_rhythm": return <SocialRhythmScreen />;
    case "reach_out": return <ReachOutScreen />;
    case "learn": return <LearnScreen />;
    case "problem_solving": return <ProblemSolvingScreen />;
      case "values_work": // retired alias — renders the active values_to_action screen
      case "values_to_action":
        return <ValuesToActionScreen />;
    case "exposure": return <ExposureHierarchyScreen />;
    case "relapse_plan": return <RelapsePlanScreen />;
    case "behaviour": return <DashboardScreen onOpenView={onOpenView} />;
    case "progress": return <ProgressDashboard onClose={onClose} />;
    case "diary": return <JournalScreen />;
    case "dbt_diary_card": return <DiaryCardScreen />;
    case "episode": return <EpisodeSupportScreen onSessionEnded={onClose} onNavigateToGrounding={() => { onClose(); onOpenGrounding(); }} onNavigateToBreathing={() => { onClose(); onOpenGrounding(); }} />;
    case "ema_checkin": return <EmaCheckInScreen onLogged={onClose} onCrisis={() => { onClose(); onActivateCrisis(); }} />;
    case "episode_marker": return <EpisodeMarkerScreen onClose={onClose} />;
    case "caregiver_settings": return <CaregiverSettingsScreen onClose={onClose} onOpenCaregiverShare={onOpenCaregiverShare} />;
    case "sounds": return <SoundPlayer />;
    case "legal": return <LegalScreen />;
    case "safety_plan": return <SafetyPlanScreen />;
    case "guided_programs":
      return (
        <GuidedProgramsScreen
          onStart={(protocolId) => {
            // startProtocolChat's returned first-step prompt has nowhere to land once we navigate away:
            // ModeScreen is unmounted while the hub is open and re-seeds `messages` purely from
            // getSessionChat() on remount (see ModeScreen.tsx's messages useState initializer) — it does
            // NOT re-run this callback's return value. Without this, the started protocol's step-1 content
            // is silently skipped: the offer card would show "step 1 of N" but tapping it would advance
            // straight to step 2. Seed the persisted transcript directly so remount picks it up.
            const result = startProtocolChat(protocolId);
            if (result.kind === "started") {
              setSessionChat([...getSessionChat(), { role: "assistant", content: result.prompt }]);
            }
            onClose();
            onOpenView("nila");
          }}
        />
      );
    default: return <div className="p-6 text-ink-muted text-sm text-center">Not available</div>;
  }
}

// ── Inner app shell (uses useNav) ───────────────────────────────────────────
function AppShell() {
  const prefersReduced = useReducedMotion();
  const nav = useNav();
  const { state, go, openCrisis, openAux, openSheet, openCapture, closeAuxStart, closeAuxDone, closeTop, setTab } = nav;
  // The ModeScreen capture sheet (if any) now lives in the nav overlay STACK (Phase 3) — ModeScreen renders
  // it + keeps its §9-gated draft local, but presence is here, so the hardware-back handler closes it
  // generically instead of the old modeScreenHasSheet signal bridge (which could go stale-true).
  const captureOverlay = state.overlays.find((o) => o.kind === "capture");
  const activeCapture = captureOverlay?.kind === "capture" ? captureOverlay.id : null;

  // Legacy booleans that are NOT yet in the nav store (or are internal to ModeScreen)
  const [groundingExpandIndex, setGroundingExpandIndex] = useState<number | undefined>(undefined);
  const [selectedCaregiverContactId, setSelectedCaregiverContactId] = useState<string | undefined>();
  const [saveWarning, setSaveWarning] = useState(false);
  const [appError, setAppError] = useState<{ message: string; type: "error" | "warning" | "info" } | null>(null);
  const [onboardingDone, setOnboardingDone] = useState(hasCompletedOnboarding());
  const [wakeListening, setWakeListening] = useState(false);
  const [phoneEnabled] = useState(true);
  const [, setLangTick] = useState(0);

  // Helper: does the overlay stack contain a specific sheet?
  const hasSheet = useCallback((id: SheetId) => hasOverlay(state, (o) => o.kind === "sheet" && o.id === id), [state]);

  // Crisis activation (latches 24h no-nudge + opens crisis overlay)
  const activateCrisis = useCallback(() => {
    void suppressNudgesForCrisis();
    openCrisis();
  }, [openCrisis]);

  // Episode support entry point (used by TodayScreen + ModeScreen)
  const onEpisode = useCallback(() => go("episode"), [go]);

  // Aux close animation timeout
  useEffect(() => {
    const aux = state.overlays.find((o) => o.kind === "aux" && o.closing);
    if (aux) {
      const t = setTimeout(() => closeAuxDone(), 200);
      return () => clearTimeout(t);
    }
  }, [state.overlays, closeAuxDone]);

  // Persistence error banner
  useEffect(() => onPersistError((failingKeys) => setSaveWarning(failingKeys.length > 0)), []);

  // App-level error display
  useEffect(() => onError((err, context) => {
    setAppError({ message: context ? `[${context}] ${err instanceof Error ? err.message : String(err)}` : (err instanceof Error ? err.message : String(err)), type: "error" });
    setTimeout(() => setAppError(null), 8000);
  }), []);

  // Language change re-render
  useEffect(() => {
    const h = () => setLangTick((n) => n + 1);
    window.addEventListener(LANGUAGE_CHANGED_EVENT, h);
    return () => window.removeEventListener(LANGUAGE_CHANGED_EVENT, h);
  }, []);

  // Phase 20 — register notification action types
  useEffect(() => { void registerNotificationActionTypes(); }, []);

  // Sync daily reminders. request:false — on cold boot we only re-arm when permission is ALREADY granted;
  // never fire the system permission dialog unprompted (matches syncEmaCheckins below). The grant is asked
  // for intentionally from onboarding / Settings, not on every app open.
  useEffect(() => { void syncDailyReminders({ request: false }); }, []);

  // Weekly digest
  useEffect(() => { void syncWeeklyDigest({ request: false }); }, []);

  // Wind-down reminder
  useEffect(() => { void syncWindDownReminder(); }, []);

  // Medication reminders
  useEffect(() => {
    try {
      const meds = loadMedications();
      if (meds.length > 0) void syncMedicationReminders(meds);
    } catch { /* best-effort */ }
  }, []);

  // Weekly insight notification
  useEffect(() => { void syncInsightNotification(); }, []);

  // Wake/bed time proxies
  useEffect(() => {
    recordFirstOpenToday();
    const handleVisibility = () => { if (document.visibilityState === "hidden") recordLastCloseToday(); };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", recordLastCloseToday);
    return () => { document.removeEventListener("visibilitychange", handleVisibility); window.removeEventListener("beforeunload", recordLastCloseToday); };
  }, []);

  // Retention metrics
  useEffect(() => { recordAppOpen(); recordPositiveSession(); }, []);

  // Pilot study endpoint reminder
  useEffect(() => {
    const p = getPilotState();
    if (p?.enrolled && !p.endpointReminderScheduled) {
      void scheduleReminderAt(new Date(`${p.endpointDueDay}T10:00:00`), PILOT_ENDPOINT_REMINDER_BODY, "NilaMind", { view: "assessment" })
        .then((r) => { if (r.ok) markEndpointReminderScheduled(); });
    }
  }, []);

  // EMA check-ins
  useEffect(() => { void syncEmaCheckins({ request: false }); }, []);

  // Wake word
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

  // Episode-adaptive UI theme
  useEffect(() => {
    function applyAdaptive() {
      const s = getUserState();
      const m = computeAdaptiveMode(s);
      const c = getAdaptiveCssClass(m);
      const html = document.documentElement;
      html.classList.remove("theme-elevated", "theme-low");
      if (c) html.classList.add(c);
    }
    applyAdaptive();
    document.addEventListener("visibilitychange", applyAdaptive);
    const interval = setInterval(applyAdaptive, 30000);
    return () => { document.removeEventListener("visibilitychange", applyAdaptive); clearInterval(interval); };
  }, []);

  // Warm Vosk STT
  useEffect(() => { warmVoskStt(); }, []);

  // Android hardware back button
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    CapApp.addListener("backButton", () => {
      const top = topOverlay(state);
      if (top?.kind === "crisis") { closeTop(); return; }
      if (top?.kind === "sheet") { closeTop(); return; }
      if (top?.kind === "capture") { closeTop(); return; } // ModeScreen capture sheet — now a normal stack overlay (Phase 3)
      if (top?.kind === "aux") { closeAuxStart(); return; }
      // Back roots to the LAUNCH tab (Today), not Nila (2026-07-18 design review: launch tab ≠ back-root
      // was disorienting — back from the home screen jumped to chat instead of exiting). Back now heads
      // home to Today from any other tab; back from Today exits, matching Android's home-then-exit norm.
      if (state.tab !== "today") { setTab("today"); return; }
      void CapApp.exitApp();
    }).then((h) => { handle = h; if (removed) h.remove(); });
    return () => { removed = true; handle?.remove(); };
  }, [state]);

  // Local notification tap routing
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    let removed = false;
    LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      try {
        const actionId = action?.actionId as string | undefined;
        if (actionId === "snooze_1h") { enableDndFor(1); return; }
        if (actionId === "snooze_3h") { enableDndFor(3); return; }
        if (actionId === "taken") {
          const medId = action?.notification?.extra?.medId;
          if (medId) { try { logMedication(medId, true, []); } catch { /* best-effort */ } }
          recordEngagement();
          return;
        }
        if (actionId === "remind_30m") {
          const medName = action?.notification?.body?.replace("Time for ", "")?.split(" ")[0] || "";
          scheduleReminderAt(new Date(Date.now() + 30 * 60_000), `Time for ${medName} — gentle reminder`, "NilaMind", { channelId: "nila_medication" }).catch(() => {});
          return;
        }
        if (actionId === "dismiss" || actionId === "not_now") { recordDismissal(); return; }

        const view = action?.notification?.extra?.view;
        if (typeof view === "string" && view) {
          recordEngagement();
          recordNotificationOpen();
          go(view);
        }
      } catch (e) {
        console.error("[App] notification tap routing failed:", e);
      }
    })
      .then((h) => { handle = h; if (removed) h.remove(); })
      .catch((e) => console.error("[App] addListener(localNotificationActionPerformed) failed:", e));
    return () => { removed = true; handle?.remove(); };
  }, [go]);

  // Deep-link routing (nilamind://voice) — the home-screen "quick voice check-in" widget
  // launches this URL instead of a generic app-open, landing directly on the Nila tab
  // (one tap from the mic) instead of wherever the app last was. See docs/FEATURES_PLAN.md
  // "User-requested — Product Hunt launch feedback" (U1) for the request this answers.
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

  // Adaptive theme
  useEffect(() => {
    function applyAdaptive() {
      const s = getUserState();
      const m = computeAdaptiveMode(s);
      const c = getAdaptiveCssClass(m);
      const html = document.documentElement;
      html.classList.remove("theme-elevated", "theme-low");
      if (c) html.classList.add(c);
    }
    applyAdaptive();
    document.addEventListener("visibilitychange", applyAdaptive);
    const interval = setInterval(applyAdaptive, 30000);
    return () => { document.removeEventListener("visibilitychange", applyAdaptive); clearInterval(interval); };
  }, []);

  // Warm Vosk STT
  useEffect(() => { warmVoskStt(); }, []);

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="relative isolate h-dvh bg-page text-ink-2 font-sans antialiased overflow-hidden flex flex-col">
      {/* Living aurora atmosphere */}
      <div className="aurora-field" aria-hidden="true" />
      {/* Skip link for keyboard navigation */}
      <a href="#chat-input" className="skip-link">Skip to chat</a>

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

      {/* App-level error toast */}
      {appError && (
        <ErrorDisplay
          message={appError.message}
          type={appError.type}
          isVisible={true}
          onDismiss={() => setAppError(null)}
        />
      )}

      {/* Listening indicator (wake word) */}
      <ListeningIndicator active={wakeListening} onClick={() => openSheet("settings")} />

      {/* Main content area — each tab isolated in its own ErrorBoundary */}
      <main className="flex-1 min-h-0 relative flex flex-col animate-tab-fade" key={state.tab} aria-label="Content">
        <a href="#today-hub" className="skip-link">Skip to main content</a>
        <div id={`tabpanel-${state.tab}`} role="tabpanel" aria-labelledby={`tab-${state.tab}`}>
        {state.tab === "nila" && (
          <ErrorBoundary name="nila" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:nila] caught:", err, info)}>
            <ModeScreen
              onOpenSettings={() => openSheet("settings")}
              onOpenCrisis={activateCrisis}
              onOpenDashboard={() => openSheet("dashboard")}
              onOpenMedication={() => openSheet("medication")}
              onOpenGrounding={(idx) => { openSheet("grounding"); setGroundingExpandIndex(idx); }}
              onOpenDiary={() => openAux("diary")}
              onOpenReachOut={() => openAux("reach_out")}
              onOpenWindDown={() => openAux("winddown")}
              activeCapture={activeCapture}
              onOpenCapture={openCapture}
              onCloseCapture={closeTop}
            />
          </ErrorBoundary>
        )}
        {state.tab === "today" && (
          <ErrorBoundary name="today" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:today] caught:", err, info)}>
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 bg-page" style={{ height: 'var(--safe-top)' }} />
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-12">
                <TodayScreen go={go} phoneEnabled={phoneEnabled} onEpisode={onEpisode} onOpenCrisis={activateCrisis} />
              </div>
            </div>
          </ErrorBoundary>
        )}
        {state.tab === "tools" && (
          <ErrorBoundary name="tools" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:tools] caught:", err, info)}>
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 bg-page" style={{ height: 'var(--safe-top)' }} />
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-12">
                <ToolsScreen go={go} phoneEnabled={phoneEnabled} onEpisode={onEpisode} onOpenCrisis={activateCrisis} />
              </div>
            </div>
          </ErrorBoundary>
        )}
        {state.tab === "you" && (
          <ErrorBoundary name="you" onError={(err: Error, info: React.ErrorInfo) => console.error("[ErrorBoundary:you] caught:", err, info)}>
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="shrink-0 bg-page" style={{ height: 'var(--safe-top)' }} />
              <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-12">
                <YouScreen go={go} onOpenCrisis={activateCrisis} />
              </div>
            </div>
          </ErrorBoundary>
        )}
        </div>
      </main>

      {/* Bottom tab bar */}
      <nav className="shrink-0 flex items-center justify-around border-t border-line bg-page/95 backdrop-blur pb-[max(8px,env(safe-area-inset-bottom))]" role="tablist" aria-label="Main navigation">
        {([
          { id: "nila" as AppTab, label: "Nila", Icon: MessageSquare },
          { id: "today" as AppTab, label: "Today", Icon: LayoutGrid },
          { id: "tools" as AppTab, label: "Tools", Icon: Wrench },
          { id: "you" as AppTab, label: t("you"), Icon: User },
        ]).map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`tab-${id}`}
            role="tab"
            onClick={() => { setTab(id); hapticLight(); }}
            className={`flex flex-col items-center gap-0.5 py-2 px-4 rounded-lg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-accent min-w-[44px] min-h-[44px] ${
              state.tab === id ? "text-accent" : "text-ink-faint hover:text-ink-2"
            }`}
            aria-label={label}
            aria-selected={state.tab === id}
            aria-controls={`tabpanel-${id}`}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </nav>

      {/* Crisis overlay */}
      {state.overlays.some((o) => o.kind === "crisis") && (
        <div className="animate-slide-in">
          <CrisisOverlay
            isOpen={true}
            onClose={closeTop}
            onNavigateToGrounding={() => { closeTop(); openSheet("grounding"); }}
            onNavigateToBreathing={() => { closeTop(); openSheet("grounding"); }}
            onBuildPlanLater={() => { closeTop(); openAux("safety_plan"); }}
          />
        </div>
      )}

      {/* Grounding library */}
      <Sheet
        open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "grounding")}
        title="Grounding"
        onClose={() => { closeTop(); setGroundingExpandIndex(undefined); }}
        id="grounding-sheet"
      >
        <GroundingLibraryScreen autoExpand={groundingExpandIndex} />
      </Sheet>

      {/* Settings sheet */}
      <Sheet
        open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "settings")}
        title={t("settings")}
        onClose={closeTop}
        id="settings-sheet"
      >
        <Suspense fallback={<ScreenFallback />}>
          <SettingsScreen onOpenCaregiver={() => openSheet("caregiver")} onOpenLegal={() => openSheet("legal")} />
        </Suspense>
      </Sheet>

      {/* Dashboard sheet */}
      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "dashboard")} title={t("dashboard")} onClose={closeTop} id="dashboard-sheet">
        <Suspense fallback={<ScreenFallback />}><DashboardScreen onOpenView={(target) => { closeTop(); go(target); }} /></Suspense>
      </Sheet>

      {/* Medication sheet */}
      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "medication")} title={t("medications")} onClose={closeTop} id="medication-sheet" bodyClassName="p-4">
        <Suspense fallback={<ScreenFallback />}><MedicationAdherenceScreen /></Suspense>
      </Sheet>

      {/* Caregiver sheet */}
      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "caregiver")} title="Share with a trusted person" onClose={closeTop} id="caregiver-sheet" bodyClassName="p-4">
        <Suspense fallback={<ScreenFallback />}><CaregiverShareScreen selectedContactId={selectedCaregiverContactId} /></Suspense>
      </Sheet>

      {/* Legal sheet — Privacy Policy, Terms, OSS licenses */}
      <Sheet open={hasOverlay(state, (o) => o.kind === "sheet" && o.id === "legal")} title="Legal" onClose={closeTop} id="legal-sheet">
        <Suspense fallback={<ScreenFallback />}><LegalScreen /></Suspense>
      </Sheet>

      {/* Generic aux view sheet — all other screens (fault-isolated) */}
      {(() => {
        const aux = state.overlays.find((o) => o.kind === "aux");
        if (!aux) return null;
        return (
          <Sheet
            open
            title={auxViewLabel(aux.view)}
            onClose={closeAuxStart}
            closing={aux.closing}
            id="aux-view-sheet"
            faultIsolated
          >
            <Suspense fallback={<ScreenFallback />}>{renderAuxView(aux.view, activateCrisis, closeAuxStart, () => openSheet("grounding"), go, (cid) => { setSelectedCaregiverContactId(cid); openSheet("caregiver"); })}</Suspense>
          </Sheet>
        );
      })()}

      {/* Full-screen breathing experience */}
      {hasOverlay(state, (o) => o.kind === "sheet" && o.id === "breathing") && (
        <Suspense fallback={null}>
          <BreathingScreen onClose={closeTop} />
        </Suspense>
      )}
    </div>
  );
}

// ── Root component: wraps shell in NavProvider ───────────────────────────────
export default function App() {
  return (
    <NavProvider>
      <AppShell />
    </NavProvider>
  );
}