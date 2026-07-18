import { useState, useEffect, type MutableRefObject } from "react";
import { localDateKey } from "../services/storageUtils";
import { activePactNotice, dismissPactNoticeToday, type PactNotice } from "../services/pactNotice";
import { secureLocal } from "../services/secureLocal";
import { parseSafetyPlan } from "../services/safetyPlan";
import {
  shouldPromptReview,
  isFirstFollowUpDue,
  markFirstFollowUpDone,
  markSafetyPlanReviewed,
} from "../services/safetyPlanFollowUp";
import { selfReportSleepSignal } from "../services/sleepInsight";
import { assessJitai, type JitaiDecision } from "../services/jitaiEngine";
import { logAndGateJitaiDecision } from "../services/jitaiDecisionLog";
import { calmSafetyPlanNudge, dismissCalmSafetyPlanNudge } from "../services/proactiveEngine";
import { computeUsageSummary } from "../services/usageAnalytics";
import { loadMoodHistory } from "../services/moodHistory";
import { computeCompassionateStreak } from "../services/streaks";

// useNudges — owns the ambient (non-crisis) nudge state + its polling/one-shot effects, extracted VERBATIM
// from ModeScreen (Phase 4 slice 2b). softCrisisCard is deliberately NOT here: it is §9/crisis flow, owned by
// ModeScreen. This hook only READS hadCrisisRef (never mutates it) to gate calm/pact/welcome away from a
// crisis; the ref is owned by ModeScreen. Effect bodies, dep arrays, the 5-min interval, the cancelled flag
// and cleanup order are byte-identical to the originals — this is a pure lift, not a rewrite.

export interface UseNudgesArgs {
  /** Live chat transcript — a new message restarts the 5-min JITAI poll and refreshes lastUserText. */
  messages: readonly { role: string; content: string }[];
  /** Open aux sheet (or null) — re-checks safety-plan staleness + signals when a sheet closes. */
  auxView: unknown;
  /** Owned by ModeScreen; read at tick/mount time to keep nudges away from a crisis. Ref keeps it out of deps. */
  hadCrisisRef: MutableRefObject<boolean>;
}

export function useNudges({ messages, auxView, hadCrisisRef }: UseNudgesArgs) {
  const [showSafetyPlanReview, setShowSafetyPlanReview] = useState(false);
  const [showSafetyPlanFollowUp, setShowSafetyPlanFollowUp] = useState(false);
  const [sleepProdromeNudge, setSleepProdromeNudge] = useState<{ firing: boolean; detail: string } | null>(null);
  const [jitaiNudge, setJitaiNudge] = useState<JitaiDecision | null>(null);
  const [calmSafetyNudge, setCalmSafetyNudge] = useState<{ show: boolean; label: string } | null>(null); // Task 1.5
  const [pactNotice, setPactNotice] = useState<PactNotice | null>(null); // #30: surfaced pact (the human bridge)
  const [welcomeBack, setWelcomeBack] = useState<string | null>(null); // lastVisitDate ISO or null

  // B3: surface a gentle safety-plan follow-up card when the plan is stale.
  // Re-check when an aux sheet closes so editing the plan immediately clears the card.
  useEffect(() => {
    try {
      const raw = secureLocal.getItem("nilamind_safetyplan");
      const plan = parseSafetyPlan(raw);
      setShowSafetyPlanReview(shouldPromptReview(plan));
      setShowSafetyPlanFollowUp(isFirstFollowUpDue(plan));
    } catch {
      setShowSafetyPlanReview(false);
      setShowSafetyPlanFollowUp(false);
    }
  }, [auxView]);

  // C1: sleep prodrome nudge (soft signal, never alarmist) + JITAI nudge
  useEffect(() => {
    let cancelled = false;
    const checkSignals = async () => {
      try {
        // Sleep prodrome from self-report (available today) or wearable when connected
        const sleepSignal = selfReportSleepSignal();
        if (!cancelled) setSleepProdromeNudge(sleepSignal);
      } catch { /* best-effort */ }

      try {
        // JITAI nudge based on current signals
        const moodHist = loadMoodHistory();
        const lastCheckin = moodHist[moodHist.length - 1];
        const daysSinceLastCheckin = lastCheckin
          ? Math.max(0, Math.floor((Date.now() - new Date(lastCheckin.date).getTime()) / 86400000))
          : 99;
        const jitai = assessJitai({
          sleep: selfReportSleepSignal(),
          moodHistory: moodHist,
          lastUserText: messages.filter(m => m.role === "user").pop()?.content,
          daysSinceLastCheckin,
          usageAnalytics: computeUsageSummary(),
        });
        if (!cancelled) setJitaiNudge(jitai);
        // 2026-07-12 Wave 3 §6: log the decision point + apply the receptivity gate. De-dupes the 5-min
        // polling loop — a repeated identical trigger within its cooldown writes fired:false instead of a
        // fresh identical entry. Does NOT change what's rendered (jitaiNudge above stays the live signal,
        // same as before) — only wiring the decision LOG per spec doc §6's task scope.
        if (!cancelled) logAndGateJitaiDecision(jitai, "in_app_card");
      } catch { /* best-effort */ }

      // Task 1.5 (2026-07-12 Wave 3): calm-moment-only safety-plan nudge — never during/adjacent to a crisis.
      try {
        if (!cancelled) setCalmSafetyNudge(hadCrisisRef.current ? null : calmSafetyPlanNudge());
      } catch { /* best-effort */ }
    };
    checkSignals();
    const interval = setInterval(checkSignals, 5 * 60 * 1000); // re-check every 5 min
    return () => { cancelled = true; clearInterval(interval); };
  }, [messages, auxView]);

  // #30 (audit): surface the user's pact when there's an active, undismissed reason. §9 always takes
  // precedence — clearForCrisis() clears it, and we skip it if this session already tripped crisis.
  useEffect(() => {
    if (hadCrisisRef.current) return;
    try { setPactNotice(activePactNotice()); } catch { /* best-effort — pact surfacing is never a hard dependency */ }
  }, []);

  // Welcome-back card: if the user hasn't checked in for >= 2 days and hasn't dismissed it today,
  // show a gentle in-app nudge. Dismissed via plain localStorage (non-sensitive UI flag).
  useEffect(() => {
    if (hadCrisisRef.current) return;
    try {
      const streak = computeCompassionateStreak();
      if (streak.daysSinceLast >= 2) {
        const dismissed = (globalThis as any).localStorage?.getItem("nilamind_welcome_back_dismissed");
        if (dismissed !== localDateKey()) {
          const d = new Date(); d.setDate(d.getDate() - streak.daysSinceLast);
          setWelcomeBack(d.toISOString());
        }
      }
    } catch { /* best-effort */ }
  }, []);

  return {
    // values
    showSafetyPlanReview,
    showSafetyPlanFollowUp,
    sleepProdromeNudge,
    jitaiNudge,
    calmSafetyNudge,
    pactNotice,
    welcomeBack,

    // §9: openCrisis clears the three ambient nudges that must never sit next to a crisis (Task 1.5).
    clearForCrisis: () => {
      setPactNotice(null);
      setWelcomeBack(null);
      setCalmSafetyNudge(null);
    },
    // "New conversation" reset — drops pact + welcome (NOT calm; matches the original startNewConversation).
    clearPactAndWelcome: () => {
      setPactNotice(null);
      setWelcomeBack(null);
    },

    // per-card dismissers (service side-effect + state clear, mirroring the old inline handlers)
    dismissSleep: () => setSleepProdromeNudge(null),
    dismissCalm: () => {
      dismissCalmSafetyPlanNudge();
      setCalmSafetyNudge(null);
    },
    dismissPact: () => {
      dismissPactNoticeToday();
      setPactNotice(null);
    },
    dismissWelcome: () => {
      try {
        (globalThis as any).localStorage?.setItem("nilamind_welcome_back_dismissed", localDateKey());
      } catch { /* best-effort */ }
      setWelcomeBack(null);
    },

    // safety-plan card completions (record + hide)
    completeSafetyPlanReview: () => {
      markSafetyPlanReviewed();
      setShowSafetyPlanReview(false);
    },
    completeSafetyPlanFollowUp: () => {
      markFirstFollowUpDone();
      setShowSafetyPlanFollowUp(false);
    },
  };
}
