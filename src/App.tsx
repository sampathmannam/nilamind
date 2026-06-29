import { secureLocal } from "./services/secureLocal";
import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Wrench, User, ChevronLeft } from "lucide-react";
import { App as CapApp } from "@capacitor/app";

import CrisisOverlay from "./components/CrisisOverlay";
import CallNilaScreen from "./components/CallNilaScreen";
import SafetyPlanScreen from "./components/SafetyPlanScreen";
import GroundingLibraryScreen from "./components/GroundingLibraryScreen";
import CheckInScreen from "./components/CheckInScreen";
import DiaryCardScreen from "./components/DiaryCardScreen";
import AiCoachScreen from "./components/AiCoachScreen";
import ThoughtRecordScreen from "./components/ThoughtRecordScreen";
import SelfCompassionScreen from "./components/SelfCompassionScreen";
import BehaviourDashboardScreen from "./components/BehaviourDashboardScreen";
import AssessmentScreen from "./components/AssessmentScreen";
import SkillsLibraryScreen from "./components/SkillsLibraryScreen";
import WindDownScreen from "./components/WindDownScreen";
import PsychoedScreen from "./components/PsychoedScreen";
import ReachOutScreen from "./components/ReachOutScreen";
import ValuesToActionScreen from "./components/ValuesToActionScreen";
import DashboardScreen from "./components/DashboardScreen";
import AgentConsoleScreen from "./components/AgentConsoleScreen";
import PactScreen from "./components/PactScreen";
import YourDataScreen from "./components/YourDataScreen";
import NilaMemoryScreen from "./components/NilaMemoryScreen";
import { AuxView, TabView, resolveNavTarget } from "./services/nav";
import WhyScreen from "./components/WhyScreen";
import ToolsScreen from "./components/ToolsScreen";
import YouScreen from "./components/YouScreen";
import { PHONE_FEATURES_ENABLED } from "./services/buildFlags";
import { syncDailyReminders } from "./services/notifications";
import { buildReflectionDigest } from "./services/nilaContext";
import { runReflection } from "./services/nilaInsights";
import { syncWidget } from "./services/widgetSync";

import SettingsScreen from "./components/SettingsScreen";
import ListeningIndicator from "./components/ListeningIndicator";
import BiometricGateHost from "./components/BiometricGateHost";
import ModelSetupGate from "./components/ModelSetupGate";

import { onSummon, setCallOpen, summonNila } from "./services/nilaActivation";
import { wakeWord } from "./services/wakeWord";
import { getWakeEnabled } from "./services/wakePrefs";

import { CheckInEntry } from "./types";
import type { NilaMode } from "./services/nilaSend";
import type { InstrumentId } from "./services/assessments";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabView>("nila");
  // Nila conversation mode — companion (default) or episode. Cluster G will lift this into full routing.
  const [nilaMode, setNilaMode] = useState<NilaMode>("companion");
  // Instrument selected for launching AssessmentScreen from Nila card taps.
  const [screeningInstrument, setScreeningInstrument] = useState<InstrumentId | null>(null);

  // enterEpisode: navigate to Nila tab in episode mode (clears any auxView first).
  const enterEpisode = () => { setAuxView(null); setActiveTab("nila"); setNilaMode("episode"); };
  const [auxView, setAuxView] = useState<AuxView | null>(null);
  const [isCrisisOverlayOpen, setIsCrisisOverlayOpen] = useState<boolean>(false);

  const [isCallOpen, setIsCallOpen] = useState<boolean>(false);
  const [wakeOn, setWakeOn] = useState<boolean>(false);
  const [hasRecentLogs, setHasRecentLogs] = useState<boolean>(false);
  const [disableAnchorPulse, setDisableAnchorPulse] = useState<boolean>(false);

  useEffect(() => {
    const savedAnimPref = localStorage.getItem("nilamind_disable_pulse");
    if (savedAnimPref === "true") setDisableAnchorPulse(true);

    // Re-arm the daily reminder on launch so it stays scheduled and the nudge text rotates (Phase 7).
    // request:false → never prompts; only re-arms when reminders are already on AND permitted.
    syncDailyReminders({ request: false }).catch(() => {});

    checkRecentLogs();

    // Check-in state helper
    const handleStorageChange = () => checkRecentLogs();
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Compounding memory: once a day, when the app goes to the background, consolidate the day's
  // activity into Nila's durable memory. Off the main path (no UI block) and throttled to once/day,
  // so it never competes with a live chat's prompt cache (which an on-open trigger would).
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        runReflection(buildReflectionDigest()).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const checkRecentLogs = () => {
    const saved = secureLocal.getItem("nilamind_checkins");
    if (saved) {
      try {
        const parsed: CheckInEntry[] = JSON.parse(saved);
        setHasRecentLogs(parsed.length > 0);
      } catch (e) {
        console.error(e);
      }
    }
    // Refresh the home-screen widget mirror after any check-in / on load (Phase 7). Best-effort.
    syncWidget();
  };

  // ── Wake-word lifecycle ──────────────────────────────────────────────────────
  // Start or stop the mic based on: call open, user preference, and page visibility.
  const startWakeIfEnabled = useCallback(async () => {
    if (isCallOpen || !getWakeEnabled() || document.visibilityState !== "visible") {
      await wakeWord.stop();
      setWakeOn(false);
      return;
    }
    const ok = await wakeWord.start(() => summonNila());
    setWakeOn(ok && wakeWord.isListening());
  }, [isCallOpen]);

  // Mount: subscribe to summon events, arm the wake word, handle foreground/background.
  useEffect(() => {
    const unsub = onSummon(() => setIsCallOpen(true));
    void startWakeIfEnabled();
    const onVis = () => { void startWakeIfEnabled(); };
    document.addEventListener("visibilitychange", onVis);
    // Settings toggle dispatches this event so (re)start/stop happens immediately,
    // without requiring a background→foreground cycle.
    const onPrefChange = () => { void startWakeIfEnabled(); };
    window.addEventListener("nilaWakePrefChanged", onPrefChange);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("nilaWakePrefChanged", onPrefChange);
      void wakeWord.stop();
    };
  }, [startWakeIfEnabled]);

  // Keep the activation controller in sync with the call screen state.
  useEffect(() => { setCallOpen(isCallOpen); }, [isCallOpen]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Android hardware back button ─────────────────────────────────────────────
  // Without this, Capacitor's default exits the app on every back press (a state-based
  // SPA has no web history to pop) — including from the crisis overlay, which would drop
  // a distressed person onto their home screen. Instead, walk the nav stack: close the
  // top-most layer (crisis → call → detail view → Tools sub-screen → back to Nila home)
  // and only exit when already on the Nila home with nothing open. A ref mirrors the live
  // nav state so the single registered listener always reads current values.
  const backStateRef = React.useRef({ isCrisisOverlayOpen, isCallOpen, auxView, activeTab });
  backStateRef.current = { isCrisisOverlayOpen, isCallOpen, auxView, activeTab };
  useEffect(() => {
    let handle: { remove: () => void } | undefined;
    CapApp.addListener("backButton", () => {
      const s = backStateRef.current;
      if (s.isCrisisOverlayOpen) { setIsCrisisOverlayOpen(false); return; }
      if (s.isCallOpen) { setIsCallOpen(false); return; }
      if (s.auxView) { setAuxView(s.auxView === "your_data" ? "dashboard" : null); return; }
      if (s.activeTab === "checkin" || s.activeTab === "diary" || s.activeTab === "plan") { setActiveTab("tools"); return; }
      if (s.activeTab !== "nila") { setActiveTab("nila"); return; }
      void CapApp.exitApp();
    }).then((h) => { handle = h; });
    return () => { handle?.remove(); };
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  // Unified navigation used by Nila / Tools / You — routes a target to the right tab or detail
  // overlay so the hubs don't each need to know the tab-vs-auxView distinction (redesign R3).
  // When Nila's inline "Practice this" card opens the Skills Library, focus that skill (AP3).
  const [focusSkillId, setFocusSkillId] = useState<string | undefined>(undefined);

  const go = (target: string) => {
    setFocusSkillId(undefined); // any general navigation clears a prior Nila skill focus
    const r = resolveNavTarget(target);
    switch (r.kind) {
      case "crisis": setIsCrisisOverlayOpen(true); return;
      case "plan": setAuxView(null); setActiveTab("plan"); return; // grounding/breathing — crisis overlay depends on this
      case "tab": setAuxView(null); setActiveTab(r.tab); return;
      case "aux": setAuxView(r.view); return;
      case "unknown":
        if ((import.meta as any).env?.DEV) console.warn(`[nav] ignored unknown target: ${r.target}`);
        return;
    }
  };

  // ── Swipe gesture navigation ───────────────────────────────────────────────
  const TABS = ["nila", "tools", "you"] as const;
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    if (auxView) {
      if (dx > 0) setAuxView(null);
      return;
    }
    const idx = TABS.indexOf(activeTab as typeof TABS[number]);
    if (dx > 0 && idx > 0) setActiveTab(TABS[idx - 1]);
    if (dx < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1]);
  };
  // ─────────────────────────────────────────────────────────────────────────────

  // Consistent "back" control for sub-screens reached from the Tools hub (check-in, diary, plan).
  const dashBack = (
    <button
      onClick={() => setActiveTab("tools")}
      className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
      aria-label="Back"
    >
      <ChevronLeft className="w-5 h-5" /> Back to Tools
    </button>
  );

  // Nila is the home/default tab and a full-screen chat. When it's showing (no auxView open),
  // the content area becomes a full-height flex column so the chat fills the viewport and its
  // input docks just above the fixed tab bar — instead of floating as a fixed-height card with
  // dead space below. Every other tab keeps the scrollable, padded layout.
  const nilaFull = !auxView && activeTab === "nila";

  return (
    <div className="min-h-screen bg-page text-slate-300 font-sans antialiased overflow-x-hidden">

      {/* Sunrise aurora — soft drifting amaranth/coral glow behind everything (light theme only) */}
      <div className="sun-aurora" style={{ width: 380, height: 380, top: -110, right: -90, background: "#EC6BA8", animation: "sunriseDrift 24s ease-in-out infinite" }} />
      <div className="sun-aurora" style={{ width: 320, height: 320, bottom: -90, left: -70, background: "#FF8A6E", animation: "sunriseDrift2 29s ease-in-out infinite" }} />
      <div className="sun-aurora" style={{ width: 300, height: 300, top: "45%", left: "52%", background: "#E85D9E", animation: "sunriseDrift 33s ease-in-out infinite" }} />

      {/* The floating crisis anchor was removed (it overlapped content). Crisis access lives in the
          Nila header (lifebuoy icon → this same overlay), the always-visible in-chat hotline banner,
          and the PHQ-9 safety route — all of which open the CrisisOverlay below. */}

      {/* CALL NILA — full-screen hands-free voice mode ("over phone") */}
      {isCallOpen && (
        <CallNilaScreen
          onEnd={() => {
            setIsCallOpen(false);
          }}
        />
      )}

      {/* LISTENING INDICATOR — top-right mic dot, visible only while wake word is armed */}
      <ListeningIndicator
        active={wakeOn && !isCallOpen}
        onClick={() => { setAuxView("settings"); }}
      />

      {/* BIOMETRIC GATE HOST — calm fallback confirm modal for no-secure-lock / web-preview path */}
      <BiometricGateHost />

      {/* MODEL SETUP GATE — first-run "download Nila's brain" screen when no on-device model is present */}
      <ModelSetupGate />

      {/* EMERGENCY CRISIS OVERLAY */}
      <CrisisOverlay
        isOpen={isCrisisOverlayOpen}
        onClose={() => setIsCrisisOverlayOpen(false)}
        onNavigateToGrounding={() => {
          setAuxView(null);
          setActiveTab("plan"); // Plan holds grounding tools visually
        }}
        onNavigateToBreathing={() => {
          setAuxView(null);
          setActiveTab("plan");
        }}
      />

      {/* CORE FRAME CONTAINER */}
      <div
        className={nilaFull ? "max-w-md mx-auto flex flex-col overflow-hidden px-4" : "max-w-md mx-auto min-h-screen px-4"}
        style={nilaFull
          ? { height: '100dvh', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }
          : { paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 112px)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* RENDER AUXILIARY FOCUS VIEWS PRE-EMPTIVELY */}
        {auxView === "behaviour" && PHONE_FEATURES_ENABLED ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <BehaviourDashboardScreen />
          </div>
        ) : auxView === "assessment" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <AssessmentScreen initialInstrument={screeningInstrument ?? undefined} onActivateCrisis={() => setIsCrisisOverlayOpen(true)} />
          </div>
        ) : auxView === "skills" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <SkillsLibraryScreen focusSkillId={focusSkillId} />
          </div>
        ) : auxView === "values_to_action" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <ValuesToActionScreen />
          </div>
        ) : auxView === "console" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <AgentConsoleScreen onOpenDashboard={() => setAuxView("dashboard")} onOpenMemory={() => setAuxView("nila_memory")} onOpenPact={() => setAuxView("pact")} />
          </div>
        ) : auxView === "pact" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <PactScreen />
          </div>
        ) : auxView === "dashboard" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <DashboardScreen onManageData={() => setAuxView("your_data")} onOpenConsole={() => setAuxView("console")} />
          </div>
        ) : auxView === "your_data" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView("dashboard")}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <YourDataScreen />
          </div>
        ) : auxView === "why" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <WhyScreen />
          </div>
        ) : auxView === "nila_memory" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <NilaMemoryScreen />
          </div>
        ) : auxView === "thought_record" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <ThoughtRecordScreen />
          </div>
        ) : auxView === "self_compassion" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <SelfCompassionScreen />
          </div>
        ) : auxView === "winddown" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <WindDownScreen />
          </div>
        ) : auxView === "understand" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <PsychoedScreen />
          </div>
        ) : auxView === "reach_out" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <ReachOutScreen />
          </div>
        ) : auxView === "settings" ? (
          <div className="space-y-4">
            <button
               onClick={() => setAuxView(null)}
               className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 mb-2 focus:outline-none cursor-pointer active:opacity-70"
               aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" /> Back
            </button>
            <SettingsScreen 
              disableAnchorPulse={disableAnchorPulse}
              onTogglePulse={(val) => {
                setDisableAnchorPulse(val);
                localStorage.setItem("nilamind_disable_pulse", val ? "true" : "false");
              }}
            />
          </div>
        ) : (
          /* STANDARD TAB NAVIGATION ROUTING */
          <div className={nilaFull ? "flex-1 flex flex-col min-h-0" : undefined}>

            {/* FULL EMOTION CHECK-IN SCREEN */}
            {activeTab === "checkin" && (
              <div>
                {dashBack}
                <CheckInScreen
                  onCheckInSaved={checkRecentLogs}
                  onNavigateToCoach={() => setActiveTab("nila")}
                />
              </div>
            )}

            {/* DBT DIARY CARD DAILY SCREEN */}
            {activeTab === "diary" && (
              <div>
                {dashBack}
                <DiaryCardScreen />
              </div>
            )}

            {/* SAFETY PLAN & GROUNDING LIBRARY COMBOS */}
            {activeTab === "plan" && (
              <div className="space-y-8" id="plan-combined-dock">
                {dashBack}
                <GroundingLibraryScreen />
                <div className="border-t border-slate-800/80 my-6 pt-6" />
                <SafetyPlanScreen />
              </div>
            )}

            {/* NILA — the AI coach (calm, chat-first; skills reachable from Tools) */}
            {activeTab === "nila" && (
              <div className="flex-1 flex flex-col min-h-0">
                <AiCoachScreen
                  mode={nilaMode}
                  onModeChange={setNilaMode}
                  onNavigateToGrounding={() => setActiveTab("plan")}
                  onNavigateToBreathing={() => setActiveTab("plan")}
                  onAgentNavigate={(view) => go(view)}
                  onOpenSkill={(id) => { setFocusSkillId(id); setAuxView("skills"); }}
                  onStartCall={() => setIsCallOpen(true)}
                  onEnterEpisode={enterEpisode}
                  onLaunchScreening={(instrument) => { setScreeningInstrument(instrument); setAuxView("assessment"); }}
                  onActivateCrisis={() => setIsCrisisOverlayOpen(true)}
                />
              </div>
            )}

            {/* TOOLS HUB — everything that used to crowd the home, grouped by intent */}
            {activeTab === "tools" && (
              <ToolsScreen go={go} phoneEnabled={PHONE_FEATURES_ENABLED} onEpisode={enterEpisode} />
            )}

            {/* YOU HUB — progress, data, the why, settings */}
            {activeTab === "you" && (
              <YouScreen go={go} />
            )}

          </div>
        )}
      </div>

      {/* CORE PERSISTENT FIXED FOOTER NAVIGATION TABS */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-slate-800 py-2 px-1 text-center shadow-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }} id="app-footer-tabs">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1">

          <button
            onClick={() => { setAuxView(null); setActiveTab("nila"); setNilaMode("companion"); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer ${
              activeTab === "nila" && !auxView ? "text-blue-400" : "text-slate-500"
            }`}
          >
            <Sparkles className="w-4.5 h-4.5" />
            <span>Nila</span>
          </button>

          <button
            onClick={() => { setAuxView(null); setActiveTab("tools"); setNilaMode("companion"); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer ${
              ["tools", "checkin", "diary", "plan"].includes(activeTab) && !auxView ? "text-blue-400" : "text-slate-500"
            }`}
          >
            <Wrench className="w-4.5 h-4.5" />
            <span>Tools</span>
          </button>

          <button
            onClick={() => { setAuxView(null); setActiveTab("you"); setNilaMode("companion"); }}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer ${
              activeTab === "you" && !auxView ? "text-blue-400" : "text-slate-500"
            }`}
          >
            <User className="w-4.5 h-4.5" />
            <span>You</span>
          </button>
        </div>
      </div>

    </div>
  );
}
