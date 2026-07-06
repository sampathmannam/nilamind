import { secureLocal, onPersistError, isPassthrough } from "./services/secureLocal";
import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Sparkles, Wrench, User, ChevronLeft, Shield } from "lucide-react";
import { App as CapApp } from "@capacitor/app";

// EAGER (welded into the boot bundle) — every screen on the first-paint or crisis path. These must render
// synchronously with NO chunk fetch: the default Nila tab, the two hubs you reach in one tap, the voice
// call, and — critically for §9 — the crisis overlay and the Plan tab it routes to (grounding + safety
// plan). A distressed person tapping "grounding" must never wait on (or hit a failed) lazy chunk load.
import CrisisOverlay from "./components/CrisisOverlay";
import CallNilaScreen from "./components/CallNilaScreen";
import SafetyPlanScreen from "./components/SafetyPlanScreen";
import GroundingLibraryScreen from "./components/GroundingLibraryScreen";
import AiCoachScreen from "./components/AiCoachScreen";
import ToolsScreen from "./components/ToolsScreen";
import YouScreen from "./components/YouScreen";

// LAZY (own chunk, fetched on first navigation) — screens reached only by a deliberate, non-emergency tap.
// This lifts ~17 screen components out of the eager boot bundle so a cold open parses/evals less at first
// paint. On native the chunks are bundled on-disk, so the first open of one is a fast local read (no
// network), covered by the calm <Suspense> fallback below. NONE of these is a crisis-entry surface.
const DiaryCardScreen = lazy(() => import("./components/DiaryCardScreen"));
const ThoughtRecordScreen = lazy(() => import("./components/ThoughtRecordScreen"));
const SelfCompassionScreen = lazy(() => import("./components/SelfCompassionScreen"));
const BehaviourDashboardScreen = lazy(() => import("./components/BehaviourDashboardScreen"));
const AssessmentScreen = lazy(() => import("./components/AssessmentScreen"));
const SkillsLibraryScreen = lazy(() => import("./components/SkillsLibraryScreen"));
const WindDownScreen = lazy(() => import("./components/WindDownScreen"));
const PsychoedScreen = lazy(() => import("./components/PsychoedScreen"));
const ReachOutScreen = lazy(() => import("./components/ReachOutScreen"));
const ValuesToActionScreen = lazy(() => import("./components/ValuesToActionScreen"));
const DashboardScreen = lazy(() => import("./components/DashboardScreen"));
const PactScreen = lazy(() => import("./components/PactScreen"));
const YourDataScreen = lazy(() => import("./components/YourDataScreen"));
const NilaMemoryScreen = lazy(() => import("./components/NilaMemoryScreen"));
const WhyScreen = lazy(() => import("./components/WhyScreen"));
const SettingsScreen = lazy(() => import("./components/SettingsScreen"));

import { AuxView, TabView, resolveNavTarget } from "./services/nav";
import { PHONE_FEATURES_ENABLED } from "./services/buildFlags";
import { syncDailyReminders } from "./services/notifications";
import { buildReflectionDigest } from "./services/nilaContext";
import { runReflection } from "./services/nilaInsights";
import { syncWidget } from "./services/widgetSync";

import ListeningIndicator from "./components/ListeningIndicator";
import BiometricGateHost from "./components/BiometricGateHost";
import ModelSetupGate from "./components/ModelSetupGate";

// Calm fallback shown while a lazy screen's chunk loads (a soft pulsing dot, no jarring spinner). On native
// this is a brief local-disk read; on web a small network fetch. Kept quiet on purpose for a MH app.
function ScreenFallback() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Loading">
      <span className="w-2.5 h-2.5 rounded-full bg-slate-500/70 animate-ping" />
    </div>
  );
}

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
  // Surfaces when an encrypted write couldn't reach disk (so a save failure is never silent). The data is
  // still safe in memory and retried on flush; this just tells the user rather than pretending it saved.
  const [saveWarning, setSaveWarning] = useState<boolean>(false);
  useEffect(() => onPersistError((failingKeys) => setSaveWarning(failingKeys.length > 0)), []);
  // Confidentiality is silently downgraded when the encrypted store can't start (private mode / crypto error)
  // and secureLocal falls back to PLAINTEXT localStorage — never lock a person out of their safety plan, but
  // don't hide it either. SecureGate boots before this mounts, so isPassthrough() is reliable here. Dismissible.
  const [plaintextNotice, setPlaintextNotice] = useState<boolean>(false);
  useEffect(() => { if (isPassthrough()) setPlaintextNotice(true); }, []);

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

  // Compounding memory: once a day, consolidate the day's activity into Nila's durable memory. This runs an
  // on-device completion, which on the llama.cpp binding blocks Capacitor's SINGLE plugin thread — so it must
  // run only while the app is FOREGROUND and the user is IDLE. Running it on 'hidden' froze the app on return
  // (the "send a message, switch tabs, come back, nothing works" bug); firing it mid-use can collide with a
  // live chat on the one model context. So: arm an idle timer, reset it on any interaction, and RE-CHECK
  // visibility at fire time. Backstops: the single-flight guard (generateOnDevice defers if busy) + the
  // once/day throttle inside runReflection.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const IDLE_MS = 20_000; // only reflect after ~20s of no interaction — keeps it clear of active use
    const attempt = () => {
      // fire-time gate: never start a completion while backgrounded, even if armed while visible
      if (document.visibilityState !== "visible") return;
      runReflection(buildReflectionDigest()).catch(() => {});
    };
    const arm = () => {
      if (t) { clearTimeout(t); t = undefined; }
      if (document.visibilityState !== "visible") return; // never arm while backgrounded
      t = setTimeout(attempt, IDLE_MS);
    };
    const onVis = () => {
      if (document.visibilityState === "visible") arm();
      else if (t) { clearTimeout(t); t = undefined; } // backgrounded → cancel any pending reflection
    };
    const onActivity = () => arm(); // any interaction resets the idle window
    arm();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      if (t) clearTimeout(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  const checkRecentLogs = () => {
    const saved = secureLocal.getItem("nilamind_checkins");
    if (saved) {
      try {
        const parsed: CheckInEntry[] = JSON.parse(saved);
        setHasRecentLogs(parsed.length > 0);
      } catch (e) {
        console.error("Failed to parse stored check-in data");
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
    let removed = false; // async-registration race guard: if cleanup runs before addListener resolves…
    CapApp.addListener("backButton", () => {
      const s = backStateRef.current;
      if (s.isCrisisOverlayOpen) { setIsCrisisOverlayOpen(false); return; }
      if (s.isCallOpen) { setIsCallOpen(false); return; }
      if (s.auxView) { setAuxView(s.auxView === "your_data" ? "dashboard" : null); return; }
      if (s.activeTab === "diary" || s.activeTab === "plan") { setActiveTab("tools"); return; }
      if (s.activeTab !== "nila") { setActiveTab("nila"); return; }
      void CapApp.exitApp();
    }).then((h) => { handle = h; if (removed) h.remove(); }); // …remove it the moment it registers (no dup/stale listener)
    return () => { removed = true; handle?.remove(); };
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
    <div className="relative isolate min-h-screen bg-page text-slate-300 font-sans antialiased overflow-x-hidden">

      {/* Living aurora atmosphere (bold redesign) — a slow breathing field of lavender/violet light
          behind the whole app on BOTH themes. Cheap radial-gradient layers (not blur), mounted once.
          See `.aurora-field` in index.css. Decorative, non-interactive. */}
      <div className="aurora-field" aria-hidden="true" />

      {/* Non-silent save-failure notice: an encrypted write couldn't reach disk. Data is safe in memory and
          retried automatically; we tell the user rather than pretend it saved. */}
      {saveWarning && (
        <div role="status" className="fixed top-0 inset-x-0 z-[60] bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-[11px] text-amber-200 leading-relaxed">
          Some changes couldn’t be saved to storage just now. They’re safe for now and we’ll keep trying — reopening the app usually fixes it.
        </div>
      )}

      {plaintextNotice && (
        <div role="status" className="fixed top-0 inset-x-0 z-[60] bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-[11px] text-amber-200 leading-relaxed flex items-center justify-center gap-3">
          <span>Encrypted storage couldn’t start on this device, so your notes are saved without encryption for now. Everything still stays on your phone.</span>
          <button onClick={() => setPlaintextNotice(false)} className="underline underline-offset-2 shrink-0 cursor-pointer" aria-label="Dismiss">Got it</button>
        </div>
      )}

      {/* Sunrise aurora — soft drifting amaranth/coral glow behind everything. LIGHT THEME ONLY: the
          `.sun-aurora` class is `display:none` by default and only `display:block` under `:root.theme-light`
          (see index.css), so these three blur layers never paint on the dark theme even though they mount. */}
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
      <main
        className={nilaFull ? "w-full flex flex-col overflow-hidden px-4" : "max-w-md mx-auto min-h-screen px-4"}
        style={nilaFull
          ? { height: '100dvh', paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }
          : { paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 112px)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* Suspense boundary for the lazy screens above. Eager screens (Nila, the hubs, and the crisis-path
            Plan tab) render synchronously through it; only a lazy screen's first open shows ScreenFallback. */}
        <Suspense fallback={<ScreenFallback />}>

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
            <DashboardScreen onManageData={() => setAuxView("your_data")} />
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
        </Suspense>
      </main>

      {/* CORE PERSISTENT FIXED FOOTER NAVIGATION TABS */}
      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-slate-800 py-2 px-1 text-center shadow-lg" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }} id="app-footer-tabs">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">

          {/* Active tab is cued by MORE than colour (accessibility: colour-only state fails for low-vision /
              colour-blind users): the active tab gets a filled pill background, bold weight, and a top
              indicator bar; inactive tabs stay medium-weight and muted. Labels raised 10px → 11px. */}
          {([
            { tab: "nila", label: "Nila", Icon: Sparkles, active: activeTab === "nila" && !auxView },
            { tab: "tools", label: "Tools", Icon: Wrench, active: ["tools", "diary", "plan"].includes(activeTab) && !auxView },
            { tab: "you", label: "You", Icon: User, active: activeTab === "you" && !auxView },
          ] as const).map(({ tab, label, Icon, active }) => (
            <button
              key={tab}
              onClick={() => { setAuxView(null); setActiveTab(tab); setNilaMode("companion"); }}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] py-2 min-h-[48px] rounded-lg active:scale-95 transition-all cursor-pointer ${
                active ? "text-blue-400 font-bold bg-blue-400/10" : "text-slate-500 font-medium"
              }`}
            >
              {active && <span aria-hidden="true" className="absolute top-0 h-0.5 w-6 rounded-full bg-blue-400" />}
              <Icon className={`w-5 h-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span>{label}</span>
            </button>
          ))}
          {/* Persistent crisis access (§9): always reachable from any tab. The floating crisis
              anchor was removed (it overlapped content); this bottom-bar button is the replacement. */}
          <button
            onClick={() => setIsCrisisOverlayOpen(true)}
            aria-label="Crisis support and safety plan"
            className="relative flex flex-col items-center justify-center gap-1 text-[11px] py-2 min-h-[48px] rounded-lg active:scale-95 transition-all cursor-pointer text-rose-400 font-medium"
          >
            <Shield className="w-5 h-5" />
            <span>Crisis</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
