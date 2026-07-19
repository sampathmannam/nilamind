// ModeScreen — the living interface that adapts to time + user state.
// Replaces the static stream with a mode-based UI.

import React, { useState, useEffect, useMemo, useRef } from "react";
import NilaFace from "./NilaFace";
import CrisisHeaderButton from "./CrisisHeaderButton";
import QuickActions from "./QuickActions";
import {
  getCurrentMode,
  getGreeting,
  getNilaQuestion,
} from "../services/modeEngine";
import { clearChatElevation, noteChatElevation } from "../services/chatElevation";
import { detectElevationRisk } from "../services/elevationGuard";
import { hasCheckinToday, getSkipFlag } from "../services/checkin";
import { stripProvenance } from "../services/emotionParse";
import { t } from "../services/i18n";
import { WELCOME_SEED, STATE_MESSAGES } from "../services/personaConfig";
import { useTypingSession } from "../hooks/useTypingSession";
import { getSuggestions, timeSlot } from "../services/chatSuggestions";
import { stripChatMarkdown, ensureListBreaks } from "../services/chatText";
import { deriveInMomentInsight } from "../services/inMomentInsight";
import { filterSkills, type Skill } from "../services/skillsLibrary";
import NilaCheckIn from "./NilaCheckIn";
import ChatLoading from "./ChatLoading";
import InMomentInsightCard from "./InMomentInsightCard";
import PactNoticeCard from "./PactNoticeCard";
import WelcomeBackCard from "./welcomeBack";
import type { CheckInEntry } from "../types";
import { sendToNila } from "../services/sendToNila";
import { NilaMode, NilaUiMessage, shouldBlockForCrisisAsync } from "../services/nilaSend";
import { suppressNudgesForCrisis, notifyReplyReady } from "../services/notifications";
import SoftCrisisCard from "./SoftCrisisCard";
import { getSessionChat, setSessionChat, clearSessionChat } from "../services/sessionChat";
import { localLlmLoadState } from "../services/localLlm";
import { offlineBrainMessage } from "../services/nilaReflect";
import { safeDraftThoughtRecord, type ThoughtRecordDraft } from "../services/thoughtRecordDraft";
import { safeDraftProblem } from "../services/problemSolvingDraft";
import { safeDraftValueDomains } from "../services/valuesDraft";
import { safeDraftSafetyPlan, type SafetyPlanDraftFields } from "../services/safetyPlanDraft";
import CaptureSheets from "./CaptureSheets";
import { selectVisibleNudges } from "./nudgeSelection";
import NudgeRail from "./NudgeRail";
import { useNudges } from "../hooks/useNudges";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { looksLikeArmRequest, requestArmedCheckin } from "../services/armedCheckin";
import { protocolOfferCard, startProtocolChat, continueProtocolChat, type ProtocolCard } from "../services/protocolChat";
import { abandonProtocol } from "../services/protocolProgress";
import { logNilaTurn } from "../services/nilaSessions";
import { speakIfEnabled, speak, listenOnce, stopSpeaking } from "../services/voice";
import { startVoiceSession, endVoiceSession } from "../services/voicePatterns";
import { checkSttCoherence } from "../services/sttCoherenceGate";
import { checkProactiveCheckIn, recordProactiveCheckIn } from "../services/proactiveCheckIn";
import { Settings, Mic, Send, MicOff, Keyboard, X, ThumbsUp, ThumbsDown, SquarePen } from "lucide-react";
import { hapticLight, hapticMedium } from "../hooks/useHaptics";
import { recordFeedback, attachSuggestion } from "../services/nilaFeedback";
import { isCloudApiEnabled, getCloudApiKey } from "../services/cloudApi";

interface ModeScreenProps {
  onOpenSettings?: () => void;
  onOpenCrisis?: () => void;
  onOpenDashboard?: () => void;
  onOpenMedication?: () => void;
  onOpenGrounding?: (expandIndex?: number) => void;
  onOpenDiary?: () => void;
  onOpenReachOut?: () => void;
  onOpenWindDown?: () => void;
  onInternalSheetChange?: (open: boolean) => void;
  closeSheetSignal?: number;
}

// #22 (audit): App wraps <main> in key={activeTab}, so switching tabs fully remounts ModeScreen and its
// useState resets — a half-typed message was lost on any tab round-trip. This module-level cache preserves the
// in-progress draft across remounts (keeps the tab crossfade animation, unlike dropping the key).
let modeDraftCache = "";


export default function ModeScreen({ onOpenSettings, onOpenCrisis, onOpenDashboard, onOpenMedication, onOpenGrounding, onOpenDiary, onOpenReachOut, onOpenWindDown, onInternalSheetChange, closeSheetSignal }: ModeScreenProps) {
  const [mode, setMode] = useState(getCurrentMode());
  const [showCheckin, setShowCheckin] = useState(() => {
    return !mode.hasCheckedIn;
  });
  const [messages, setMessages] = useState<NilaUiMessage[]>(() => {
    // Restore saved session if one exists (survives app restart)
    const saved = getSessionChat();
    if (saved.length) return saved;
    // Seed a warm greeting on first launch — so the chat is never blank.
    // Previously messages started empty and the user had to type first.
    return [{ role: "assistant", content: WELCOME_SEED }];
  });
  const [inputText, setInputText] = useState(() => modeDraftCache); // #22: restore draft after a tab-switch remount
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [auxView, setAuxView] = useState<"learn" | "thought_record" | "problem_solving" | "values_to_action" | "safety_plan" | null>(null);
  const [thoughtRecordDraft, setThoughtRecordDraft] = useState<ThoughtRecordDraft | undefined>();
  const [problemDraft, setProblemDraft] = useState<{ problem: string } | undefined>();
  const [valuesHighlight, setValuesHighlight] = useState<string[]>([]);
  const [safetyPlanDraft, setSafetyPlanDraft] = useState<SafetyPlanDraftFields | undefined>();
  const [protocolCard, setProtocolCard] = useState<ProtocolCard | null>(() => protocolOfferCard(""));
  const [softCrisisCard, setSoftCrisisCard] = useState(false); // 2026-07-12 Wave 3: soft tier, classifier-only hits
  const [confirmNewChat, setConfirmNewChat] = useState(false); // "new conversation" confirm dialog
  const newChatConfirmRef = useFocusTrap<HTMLDivElement>(confirmNewChat, () => setConfirmNewChat(false));

  // hadCrisisRef is OWNED here (a session that ever tripped §9 latches it — see openCrisis / persist effect /
  // startNewConversation). Declared before useNudges so the hook can READ it to keep calm/pact/welcome nudges
  // away from a crisis. The ambient nudge state + its polling/one-shot effects live in useNudges (slice 2b);
  // softCrisisCard stays here because it is §9/crisis flow, not an ambient nudge.
  const hadCrisisRef = useRef(false);
  const nudges = useNudges({ messages, auxView, hadCrisisRef });
  const {
    showSafetyPlanReview,
    showSafetyPlanFollowUp,
    sleepProdromeNudge,
    jitaiNudge,
    calmSafetyNudge,
    pactNotice,
    welcomeBack,
  } = nudges;

  // Ambient nudges: collapse the three mutually-exclusive safety-plan asks (follow-up > review > calm, by
  // clinical priority — the ~48h Stanley-Brown follow-up matters most) to ONE card, then cap the footer at
  // MAX_NUDGES (crisis cards render separately and always show). Pure selection lives in nudgeSelection.ts,
  // unit-tested for the priority order + cap.
  const { safetyPlanCard, visibleNudgeIds } = selectVisibleNudges({
    safetyPlanFollowUp: showSafetyPlanFollowUp,
    safetyPlanReview: showSafetyPlanReview,
    calmSafetyNudgeShow: !!calmSafetyNudge?.show,
    sleepProdrome: !!sleepProdromeNudge,
    jitaiShouldNudge: !!jitaiNudge?.shouldNudge,
    pact: !!pactNotice,
    welcome: !!welcomeBack,
  });

  const [ratedMessages, setRatedMessages] = useState<Set<number>>(new Set());
  const [dismissedSkillMessages, setDismissedSkillMessages] = useState<Set<number>>(new Set());
  // 2026-07-12 Wave 3, Group F: completes the already-built-but-unwired attachSuggestion() flow — a one-tap,
  // optional, dismissable "what would've helped?" follow-up after a thumbs-down. Never forced.
  const [suggestionPrompt, setSuggestionPrompt] = useState<{ index: number; feedbackId: string } | null>(null);
  const [suggestionText, setSuggestionText] = useState("");
  const [showQuickActions, setShowQuickActions] = useState(false);
  // #4 + #9 (audit): §9 crisis now routes through the App-level overlay (onOpenCrisis) so the Android hardware
  // back button closes it instead of exiting the app; a session that ever tripped §9 latches hadCrisisRef so
  // the transcript is never persisted/restored (keying the clear on a transient boolean re-persisted it on dismiss).
  // hadCrisisRef itself is declared above (before useNudges, which reads it).
  const crisisPendingRef = useRef(false); // #5-out (re-audit): a sent turn whose async §9 verdict is still pending
  // openCrisis(detected, tier): `detected` = the model/gate FLAGGED a §9 crisis in the user's turn. Only then
  // do we latch "never persist" + wipe the transcript + clear self-help cards (§9 precedence) — UNCONDITIONAL
  // on `detected`, NOT gated by tier, so a soft-tier hit gets the identical protection as a full-tier hit.
  // A PROACTIVE open (the user tapping crisis resources) must NOT wipe their in-progress conversation
  // (#6 re-audit) nor offer nothing.
  //
  // `tier` (2026-07-12 Wave 3, two-tier crisis surface; RETIERED 2026-07-12 Bug 1 fix — adversarial review
  // found the original branch used `source === "classifier"`, which wrongly treated EVERY classifier-only
  // hit as low-confidence, including genuine high-confidence disclosures the keyword floor structurally
  // cannot see — e.g. "everyone would be better off without me" scores 0.8837. `tier` is the field that
  // actually reflects confidence — see crisisClassifier.ts's CrisisTier docs): tier === "soft" renders the
  // SOFT inline SoftCrisisCard instead of the full-screen CrisisOverlay. A null/unspecified tier (proactive
  // taps, the arm-request branch, ambiguous/fail-closed cases), tier === "full", and every other existing call
  // site all fall through unchanged to onOpenCrisis?.() — bit-for-bit the same full takeover as today. Only
  // the RENDERING SURFACE differs by tier; every other invariant above stays unconditional.
  const openCrisis = (detected = false, tier: "full" | "soft" | null = null) => {
    if (detected) {
      hadCrisisRef.current = true;
      clearSessionChat();      // the flagged crisis turn must never persist/restore
      setProtocolCard(null);
      void suppressNudgesForCrisis(); // P6.4: latch no-nudge + yank queued pings, same as App.tsx's activateCrisis
    }
    nudges.clearForCrisis(); // §9 takes precedence: clears pact + welcome-back + calm-moment safety-plan nudge (Task 1.5)
    if (detected && tier === "soft") {
      setSoftCrisisCard(true); // soft tier — inline card, no full takeover
      return;
    }
    // Bug 2 fix (2026-07-12, adversarial review): the full-takeover branch must unconditionally clear any
    // STALE soft card from an earlier turn. Repro without this: soft card shows for message A → message B is
    // a full-tier hit before the card is dismissed → CrisisOverlay opens on top of it → user dismisses the
    // overlay → the stale card reappears underneath, re-asking "Can I pause here?" right after the user just
    // went through the full safety-plan flow.
    setSoftCrisisCard(false);
    onOpenCrisis?.();
  };
  const bottomRef = useRef<HTMLDivElement>(null); // #23: scroll-to-newest anchor

  // #23 (audit): keep the newest reply in view (ModeScreen had no scroll-to-bottom, unlike EpisodeSupportScreen).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // #22 (audit): mirror the in-progress draft to the module cache so a tab-switch remount doesn't lose it.
  useEffect(() => { modeDraftCache = inputText; }, [inputText]);

  // Refresh mode every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setMode(getCurrentMode());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Notify App when internal sheets open/close (for back-button handling)
  useEffect(() => {
    onInternalSheetChange?.(auxView !== null);
  }, [auxView, onInternalSheetChange]);

  // Hardware-back (via App's closeSheetSignal) closes whichever auxView overlay is open + drops its draft,
  // instead of leaving it stranded (design review 2026-07-18).
  useEffect(() => {
    if (!closeSheetSignal) return;
    setAuxView(null);
    setThoughtRecordDraft(undefined);
    setProblemDraft(undefined);
    setValuesHighlight([]);
    setSafetyPlanDraft(undefined);
  }, [closeSheetSignal]);

  // (B3 safety-plan review/follow-up + C1 sleep-prodrome/JITAI/calm-moment nudge effects moved to
  //  useNudges — Phase 4 slice 2b. Behaviour, deps, and the 5-min poll are unchanged.)

  // audit 2.1 — CHAT PERSISTENCE (regressed in the rewrite: sessionChat was imported but never used).
  // Restore an in-progress conversation on mount so it survives leaving/killing the app; a crisis session
  // is intentionally never restored (it is cleared by the persist effect below).
  // Note: the greeting is seeded in the initial state of `messages` — if getSessionChat() returns
  // empty, the greeting stays and this effect does nothing.
  useEffect(() => {
    const saved = getSessionChat();
    if (saved.length) setMessages(saved);
  }, []);

  // (#30 pact-surface + welcome-back one-shot effects moved to useNudges — Phase 4 slice 2b. Both still
  //  skip when hadCrisisRef.current, and §9 clears them via nudges.clearForCrisis().)

  // Persist the chat as it grows. INVARIANT: a §9 crisis turn is NEVER persisted — clear the store so a
  // crisis transcript can't be restored later (mirrors the old AiCoachScreen rule). asyncReflection and
  // armedCheckin read getSessionChat(), so this is also what makes those features see real conversations.
  useEffect(() => {
    // #4 (audit): once a session has EVER tripped §9, never persist it. The old code keyed the clear on the
    // transient showCrisis boolean, so the crisis transcript was re-written the instant the overlay closed.
    if (hadCrisisRef.current) { clearSessionChat(); return; }
    // #5-out (2026-07-10 re-audit): a just-sent turn whose §9 verdict is still pending (the classifier runs an
    // async MiniLM pass) must NOT be written yet — otherwise a euphemistic crisis the keyword floor misses is
    // persisted during the embedder window, and a kill there leaves it durable + restored next launch.
    if (crisisPendingRef.current) return;
    if (messages.length) setSessionChat(messages);
  }, [messages]);

  const handleCheckinLogged = (entry: CheckInEntry) => {
    setShowCheckin(false);
    clearChatElevation(); // a fresh check-in supersedes any chat-detected elevation → relax the UI
    setMode(getCurrentMode());
    hapticMedium();
    // The check-in is tapped, not typed — but it must still appear as the user's turn (a right-aligned
    // bubble) so the transcript reads as a real two-sided exchange. Previously only the assistant's ack
    // was appended, so the reply looked orphaned with no visible context for what it was replying to.
    const hasContext = entry.context && entry.context !== "Nila check-in";
    const checkinSummary = `Checked in: feeling ${stripProvenance(entry.emotion).toLowerCase()}, ${entry.intensity}/10${hasContext ? ` — ${entry.context}` : ""}`;
    setMessages((prev) => [
      ...prev,
      { role: "user", content: checkinSummary },
      { role: "assistant", content: `Thank you. I'll keep that in mind.` },
    ]);
  };

  const handleCheckinSkip = () => {
    setShowCheckin(false);
  };

  const handleSendMessage = async (text?: string) => {
    const msg = text || inputText.trim();
    if (!msg || loading) return;

    chatTyping.stop(msg.length);
    setInputText("");
    hapticLight();
    const userMsg: NilaUiMessage = { role: "user", content: msg };
    crisisPendingRef.current = true; // #5-out: hold this turn out of sessionChat until its §9 verdict returns
    setMessages((prev) => [...prev, userMsg]);
    logNilaTurn("coach", msg); // dashboard "Nila chats" — was never wired for the main tab (2026-07-12 QA).
    // Counted BEFORE the §9 gate below: a crisis-blocked message is still a real turn the user reached out
    // with. Only the user's own text is stored (never the AI reply), same as the Episode surface.

    // Armed check-in is a deterministic, opt-in command — handle it before the model.
    if (looksLikeArmRequest(msg)) {
      // Bug 3 fix (2026-07-12, adversarial review): this branch never set `loading` before its await below,
      // unlike the main send path (setLoading(true) at the top of that try, further down). That left the
      // Send button enabled during the pending §9 check, so a second message could be sent concurrently and
      // interleave with this turn's still-pending verdict. Match the main path's re-entrancy guard.
      setLoading(true);
      try {
        // #3 (audit): the arm path gates with keyword-only scanForCrisis, so a euphemistic crisis that also
        // matches the arm-request regex ("check on me… the world would feel lighter without me") would get a
        // cheerful check-in confirmation. Run the full classifier-backed §9 gate here first.
        if (await shouldBlockForCrisisAsync(msg)) { openCrisis(true); return; }
        crisisPendingRef.current = false; // arm request cleared the §9 gate — not a crisis, safe to persist
        const armResult = requestArmedCheckin(msg, [...messages, userMsg]);
        if (armResult.ok) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Got it — I'll check in with you ${armResult.triggerLabel}.` },
          ]);
        } else if (armResult.reason === "crisis") {
          openCrisis(true);
        } else {
          const reply =
            armResult.reason === "elevation"
              ? "Let's slow down a little before I set a check-in — what you're describing sounds elevated, and I don't want to nudge you at the wrong moment."
              : armResult.reason === "quiet"
              ? "I'll stay quiet — no check-ins unless you ask again."
              : armResult.reason === "frequency"
              ? "You already have a check-in set. I'll keep that one."
              : null;
          if (reply) {
            setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
          }
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Surface a protocol offer/continue card (§9-gated inside protocolOfferCard).
    setProtocolCard(protocolOfferCard(msg));

    setLoading(true);

    try {
      const allMessages = [...messages, userMsg];
      const result = await sendToNila(allMessages, "companion", {
        onDelta: (t: string) => {},
      });
      if (result.blocked) {
        // §9 crisis: open the crisis surface (tappable lines + safety plan) — full takeover for tier:"full"
        // (every keyword hit, plus any HIGH-CONFIDENCE classifier hit), soft inline card for tier:"soft"
        // (2026-07-12 Wave 3; RETIERED 2026-07-12 Bug 1 fix — branching on crisisSource instead of crisisTier
        // was the adversarial review's confirmed regression: "classifier-only" is not a confidence signal).
        // #7 (re-audit): RETURN so we never fall through to the coping-skill / protocol self-help cards below
        // — offering "this might help" in reply to a suicidal disclosure softens the §9 stop-everything
        // posture. openCrisis(true, ...) also latches "never persist" for this turn, unconditional on tier.
        // `?? "full"` fails closed to the full takeover if the tier is ever ambiguous.
        openCrisis(true, result.crisisTier ?? "full");
        if (result.reply) setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
        return;
      }
      // SOFT-tier presentation split: the model's companion reply is shown, then the CrisisPill
      // (SoftCrisisCard) appears below it. No full takeover — the user can keep chatting while
      // the soft card is visible. The card is dismissed by the user or cleared on the next turn.
      if (result.softCrisis) {
        setSoftCrisisCard(true);
      }
      crisisPendingRef.current = false; // #5-out: §9 verdict is NOT a crisis → this turn may now persist
      // Manic-first: if the user typed manic content this turn (deterministic, LLM-independent), latch it so
      // the interface settles — the pixel-level half of the elevation guard (which also steers Nila's words).
      // Not written on a §9 turn (that path returned above). Picked up by the setMode(getCurrentMode()) below.
      noteChatElevation(detectElevationRisk(msg).level);
      const previousExplainerId =
        [...messages].reverse().find((m) => m.role === "assistant")?.insight?.explainer?.id ?? null;
      const insight = await deriveInMomentInsight(msg, mode.userState, previousExplainerId);
      if (result.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.reply, insight: insight ?? undefined }]);
        if (result.reachedAI) {
          speakIfEnabled(result.reply);
          if (document.hidden) void notifyReplyReady();
        }
      } else if (!result.reachedAI) {
        // No reply AND no model reached. Never leave the person in silence: explain WHY (cloud misconfigured,
        // or the on-device brain isn't ready) and point to the tools that work regardless. (2026-07-17 QA:
        // the on-device branch was missing entirely — a skip-download user typed into a void.)
        const content = isCloudApiEnabled() && getCloudApiKey()
          ? "Cloud API returned an empty response — check your API key and endpoint in Settings → Advanced → Cloud API."
          : offlineBrainMessage(localLlmLoadState());
        setMessages((prev) => [...prev, { role: "assistant", content }]);
      }
      // After Nila replies, refresh the protocol card (continue if active, else re-offer).
      setProtocolCard(protocolOfferCard(msg));
      // Chat-detected elevation may have latched during this turn (localNila → noteChatElevation) — recompute
      // the mode so the interface settles (orb slows, home thins) in response to what the user just typed.
      setMode(getCurrentMode());
    } catch (err) {
      crisisPendingRef.current = false; // model error is not a §9 crisis — let the turn persist
      const isCloud = isCloudApiEnabled() && getCloudApiKey();
      const msg = isCloud
        ? "Cloud API isn't responding — check your API key and endpoint in Settings → Advanced → Cloud API. Your conversations are still private on-device in the meantime."
        : "I'm having a quiet moment — my model isn't responding right now. Your phone might be low on memory or the model needs a moment. Try typing again? 💙";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: msg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = async () => {
    if (listening) {
      setListening(false);
      setShowTextInput(false);
      stopSpeaking();
      return;
    }

    setListening(true);
    setShowTextInput(false);
    const vsId = startVoiceSession("chat");
    try {
      const text = await listenOnce();
      endVoiceSession(vsId, text);
      if (text) {
        // STT incoherence gate: check if the transcript is garbled before sending to the model.
        // Only applies to voice input — typed input bypasses this check.
        const coherence = checkSttCoherence(text);
        if (!coherence.coherent) {
          // Garbled transcript — show a gentle "didn't catch that" instead of sending to the model.
          setMessages((prev) => [
            ...prev,
            { role: "user", content: text },
            { role: "assistant", content: "I didn't quite catch that — could you say that again?" },
          ]);
          return;
        }
        handleSendMessage(text);
      }
    } catch {
      endVoiceSession(vsId, "");
    } finally {
      setListening(false);
    }
  };

  const openThoughtRecord = async () => {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    setLoading(true);
    const result = await safeDraftThoughtRecord(lastUserMsg);
    setLoading(false);
    if (!result.ok) {
      if (result.reason === "crisis") {
        openCrisis(true); // detected §9 in the user's last message
        return;
      }
      // empty → open blank
    } else {
      setThoughtRecordDraft(result.draft);
    }
    setAuxView("thought_record");
  };

  const openProblemSolving = async () => {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    setLoading(true);
    const result = await safeDraftProblem(lastUserMsg);
    setLoading(false);
    if (!result.ok) {
      if (result.reason === "crisis") {
        openCrisis(true); // detected §9 in the user's last message
        return;
      }
      // empty / nothing solvable → open a blank problem-solving screen
    } else {
      setProblemDraft({ problem: result.problem });
    }
    setAuxView("problem_solving");
  };

  const openValues = async () => {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    setLoading(true);
    const result = await safeDraftValueDomains(lastUserMsg);
    setLoading(false);
    if (!result.ok) {
      if (result.reason === "crisis") {
        openCrisis(true); // detected §9 in the user's last message
        return;
      }
      setValuesHighlight([]); // nothing clearly came up → open the tool as usual
    } else {
      setValuesHighlight(result.domains); // presence-only; the person still rates everything
    }
    setAuxView("values_to_action");
  };

  const openSafetyPlan = async () => {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop()?.content || "";
    setLoading(true);
    const result = await safeDraftSafetyPlan(lastUserMsg);
    setLoading(false);
    if (!result.ok) {
      if (result.reason === "crisis") {
        openCrisis(true); // an active-crisis message goes to §9 help, never into a drafting flow
        return;
      }
      setSafetyPlanDraft(undefined); // nothing to draft → open a blank safety plan
    } else {
      setSafetyPlanDraft(result.draft); // pre-fills empty coping fields only; never saved until they save
    }
    setAuxView("safety_plan");
  };

  const handleOpenSafetyPlan = () => {
    setAuxView("safety_plan");
  };

  const handleMarkSafetyPlanReviewed = () => nudges.completeSafetyPlanReview();

  const handleMarkSafetyPlanFollowUpDone = () => nudges.completeSafetyPlanFollowUp();

  const handleProtocolTap = () => {
    if (!protocolCard) return;
    if (protocolCard.active) {
      const result = continueProtocolChat();
      if (result.kind === "done") {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `You've completed ${result.title}. Nice work — small steps add up.` },
        ]);
        setProtocolCard(null);
      } else if (result.kind === "advanced") {
        setMessages((prev) => [...prev, { role: "assistant", content: result.prompt }]);
        setProtocolCard(protocolOfferCard(""));
      } else {
        // Protocol state is stale/corrupted — clear it and offer a fresh start
        setProtocolCard(null);
        abandonProtocol();
        setMessages((prev) => [...prev, { role: "assistant", content: "Let's pick that up fresh — whenever you're ready." }]);
      }
    } else {
      const result = startProtocolChat(protocolCard.protocolId);
      if (result.kind === "started") {
        setMessages((prev) => [...prev, { role: "assistant", content: result.prompt }]);
        setProtocolCard(protocolOfferCard(""));
      }
    }
  };

  const handleTrySkill = (skill: Skill) => {
    const steps = skill.steps?.length
      ? skill.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : skill.purpose;
    hapticMedium();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `**${skill.name}** — ${skill.purpose}\n\n${steps}\n\nTake your time with this. Even a small try counts. 💙` },
    ]);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "grounding":
        onOpenGrounding?.();
        break;
      case "breathing":
        onOpenGrounding?.(1); // Auto-expand Box Breathing (index 1)
        break;
      case "diary":
        onOpenDiary?.();
        break;
      case "medication":
        if (onOpenMedication) {
          onOpenMedication();
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Did you take your medication today?" },
          ]);
        }
        break;
      case "dashboard":
        onOpenDashboard?.();
        break;
      case "crisis":
        openCrisis();
        break;
      case "learn":
        setAuxView("learn");
        break;
      case "thought_record":
        void openThoughtRecord();
        break;
      case "problem_solving":
        void openProblemSolving();
        break;
      case "self_compassion": {
        const result = startProtocolChat("self-compassion");
        if (result.kind === "started") {
          setMessages((prev) => [...prev, { role: "assistant", content: result.prompt }]);
          setProtocolCard(protocolOfferCard(""));
        }
        break;
      }
      case "values_to_action":
        void openValues();
        break;
      case "safety_plan":
        void openSafetyPlan();
        break;
      case "reach_out":
        onOpenReachOut?.();
        break;
      case "wind_down":
        onOpenWindDown?.();
        break;
      default:
        break;
    }
  };

  const greetingMap: Record<string, string> = {
    morning: t("greeting_morning"),
    day: t("greeting_day"),
    evening: t("greeting_evening"),
    night: t("greeting_night"),
  };
  const greeting = greetingMap[mode.timeMode] ?? getGreeting(mode.timeMode);

  const slot = timeSlot();
  const recentMood = messages.length > 0 ? { intensity: 5, emotion: "" } : null; // simplified — use actual mood if available
  const suggestions = useMemo(() => getSuggestions(slot, recentMood), [slot, messages.length]);

  const chatTyping = useTypingSession("chat");
  const question = getNilaQuestion(mode.timeMode, mode.userState, mode.hasCheckedIn);

  // Explicit "new conversation" — clears the transcript (memory + encrypted store) and resets the live UI so
  // the on-device model is no longer fed the prior turns (which a small model imitates over its system prompt).
  // Also lifts the crisis latch so the fresh chat persists normally again.
  const startNewConversation = () => {
    clearSessionChat();
    setMessages([]);
    nudges.clearPactAndWelcome();
    setRatedMessages(new Set());
    setDismissedSkillMessages(new Set());
    setProtocolCard(protocolOfferCard(""));
    hadCrisisRef.current = false;
    setConfirmNewChat(false);
  };

  return (
    <div className="flex flex-col h-full bg-page">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{greeting}</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setConfirmNewChat(true)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="New conversation"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t("settings")}
          >
            <Settings className="w-4 h-4" />
          </button>
          {/* Persistent CALM crisis access (2026-07-18 design review + UX_RESEARCH #6). Previously the Nila
              tab — the app's most-used surface — had NO discoverable crisis control (only an undiscoverable
              orb long-press). §9 auto-detection still routes through openCrisis() on top of this. */}
          <CrisisHeaderButton onClick={() => openCrisis()} />
        </div>
      </div>

      {/* New-conversation confirm — clearing a mental-health chat is destructive, so gate it behind a gentle ask */}
      {confirmNewChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Start a new conversation"
          onClick={() => setConfirmNewChat(false)}
        >
          <div
            ref={newChatConfirmRef}
            tabIndex={-1}
            className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-3 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-slate-100">Start a new conversation?</p>
            <p className="text-xs text-slate-400">
              This clears the current chat from your device. Nila won't carry what was said here into the new one.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmNewChat(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-200 text-sm cursor-pointer hover:bg-slate-700 transition-colors min-h-[44px] focus-ring"
              >
                Keep it
              </button>
              <button
                onClick={startNewConversation}
                className="flex-1 py-3 rounded-xl text-white text-sm cursor-pointer transition-opacity hover:opacity-90 min-h-[44px] focus-ring"
                style={{ backgroundColor: "#6b21a8" }}
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content — scrollable for chat messages */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start p-4 space-y-6 pt-8">
        {/* Check-in card — dismissable, sits above the chat so Nila is always visible.
            Previously this replaced the entire chat area, meaning "Talk to Nila" opened
            a form, not a conversation. Now the check-in is an optional card above the
            always-visible NilaFace + question + input. */}
        {showCheckin && (
          <div className="w-full max-w-sm relative">
            <button
              onClick={handleCheckinSkip}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Skip check-in"
            >
              <X className="w-4 h-4" />
            </button>
            <NilaCheckIn onLogged={handleCheckinLogged} onSkip={handleCheckinSkip} />
          </div>
        )}

        {/* Nila's face + question — always visible, never gated behind check-in */}
        <NilaFace
          state={mode.userState}
          onClick={handleVoice}
          onLongPress={() => openCrisis()}
          size={160}
          isListening={listening}
        />

        <div className="text-center space-y-2">
          <p className="text-lg text-slate-200 font-display">{question}</p>
          {mode.userState && mode.userState !== "calm" && (
            <p className="text-xs text-slate-400">
              {mode.userState === "anxious" && STATE_MESSAGES.anxious}
              {mode.userState === "low" && STATE_MESSAGES.low}
              {mode.userState === "elevated" && STATE_MESSAGES.elevated}
            </p>
          )}
        </div>

        {/* Quick actions — hidden behind a toggle for a cleaner first impression */}
        {!showQuickActions && (
          <button
            onClick={() => setShowQuickActions(true)}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer py-2 px-3 min-h-[44px] min-w-[44px] focus-ring"
          >
            <span>More tools</span>
            <span className="text-slate-600">+</span>
          </button>
        )}
        {showQuickActions && (
          <>
            <QuickActions onAction={handleQuickAction} timeMode={mode.timeMode} userState={mode.userState} />
            <button
              onClick={() => setShowQuickActions(false)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer py-2 px-3 min-h-[44px] min-w-[44px] focus-ring"
            >
              Hide tools
            </button>
          </>
        )}

        {/* Messages — #23 (audit): render the FULL conversation (was slice(-5), so earlier turns became
            unreachable) and auto-scroll to the newest reply via bottomRef below. */}
        {messages.length > 0 && (
          <div className="w-full max-w-sm space-y-3 mt-4" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div>
                  <div
                   className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words ${
                     m.role === "user"
                       ? "bg-purple-600/70 text-white"
                       : "bg-slate-800/80 text-slate-200"
                   }`}
                  >
                    {m.role === "user" ? m.content : ensureListBreaks(stripChatMarkdown(m.content))}
                  </div>
                  {m.role === "assistant" && !ratedMessages.has(i) && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => {
                          recordFeedback(m.content, "up");
                          setRatedMessages((prev) => new Set(prev).add(i));
                          hapticLight();
                        }}
                        className="p-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring"
                        aria-label="Mark as helpful"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          const entry = recordFeedback(m.content, "down");
                          setRatedMessages((prev) => new Set(prev).add(i));
                          hapticLight();
                          setSuggestionText("");
                          setSuggestionPrompt({ index: i, feedbackId: entry.id });
                        }}
                        className="p-2.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring"
                        aria-label="Mark as not helpful"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                    )}
                    {m.role === "assistant" && m.insight && (
                      <InMomentInsightCard
                        explainerTitle={m.insight.explainer?.title ?? ""}
                        explainerSummary={m.insight.explainer?.summary ?? ""}
                        explainerBasis={m.insight.explainer?.basis ?? ""}
                        skillEmoji={m.insight.skill?.emoji ?? ""}
                        skillName={m.insight.skill?.skill.name ?? ""}
                        skillReason={m.insight.skill?.reason ?? ""}
                        skillDismissed={dismissedSkillMessages.has(i)}
                        onDismissSkill={() =>
                          setDismissedSkillMessages((prev) => new Set(prev).add(i))
                        }
                        onTrySkill={
                          m.insight.skill
                            ? () => handleTrySkill(m.insight!.skill!.skill)
                            : undefined
                        }
                      />
                    )}
                    {/* 2026-07-12 Wave 3, Group F: one-tap, dismissable "what would've helped?" follow-up —
                        completes the already-built attachSuggestion() flow. Optional, never forced; a bare
                        thumbs-down alone is still a complete, valid piece of feedback. */}
                    {suggestionPrompt?.index === i && (
                      <div
                        id="feedback-suggestion-prompt"
                        className="mt-1.5 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700 text-xs space-y-2 max-w-[85%]"
                      >
                        <p className="text-slate-300">What would've helped?</p>
                        <input
                          type="text"
                          value={suggestionText}
                          onChange={(e) => setSuggestionText(e.target.value)}
                          placeholder="What would've helped? (optional)"
                          className="w-full px-2.5 py-2 rounded-md bg-slate-900/70 border border-slate-700 text-slate-200 placeholder:text-slate-500 focus-ring"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setSuggestionPrompt(null); setSuggestionText(""); }}
                            className="px-3 py-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors cursor-pointer min-h-[44px] focus-ring"
                            aria-label="Not now"
                          >
                            Not now
                          </button>
                          <button
                            onClick={() => {
                              if (suggestionText.trim()) attachSuggestion(suggestionPrompt.feedbackId, suggestionText);
                              setSuggestionPrompt(null);
                              setSuggestionText("");
                            }}
                            className="px-3 py-2 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
                            aria-label="Share what would help"
                          >
                            Share
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
            ))}
          </div>
        )}

            {/* Chat loading — skeleton shimmer + typing dots */}
            {loading && <ChatLoading />}

            {/* #23 (audit): scroll anchor so a new reply is always brought into view. */}
            <div ref={bottomRef} />
      </div>

      {/* Input bar — always visible, even during check-in (check-in is a dismissable card above, not a gate).
          Previously this was gated behind `!showCheckin`, which meant the user could see Nila but couldn't
          type/speak until the check-in was completed or dismissed. Now the chat is fully usable at all times. */}
      <div className="px-4 py-3 border-t border-slate-800/50 space-y-2">
{/* Soft crisis card (2026-07-12 Wave 3) — inline surface for a classifier-only §9 hit. Escalating opens the
              REAL full-takeover CrisisOverlay directly; dismissing only clears this card — it does NOT un-latch
              hadCrisisRef or restore the wiped transcript (one-way door, same as a keyword hit today). */}
          {softCrisisCard && (
            <SoftCrisisCard
              onEscalate={() => { setSoftCrisisCard(false); onOpenCrisis?.(); }}
              onDismiss={() => setSoftCrisisCard(false)}
            />
          )}

          <NudgeRail
            visibleNudgeIds={visibleNudgeIds}
            safetyPlanCard={safetyPlanCard}
            calmSafetyNudge={calmSafetyNudge}
            sleepProdromeNudge={sleepProdromeNudge}
            jitaiNudge={jitaiNudge}
            onOpenSafetyPlan={handleOpenSafetyPlan}
            onCompleteReview={handleMarkSafetyPlanReviewed}
            onCompleteFollowUp={handleMarkSafetyPlanFollowUpDone}
            onDismissCalm={() => nudges.dismissCalm()}
            onDismissSleep={() => nudges.dismissSleep()}
            onOpenWindDown={onOpenWindDown}
            onQuickAction={handleQuickAction}
          />

{protocolCard && (
            <button
              onClick={handleProtocolTap}
              className="w-full text-left px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors cursor-pointer min-h-[44px] focus-ring"
              id="protocol-card"
            >
              {protocolCard.label}
            </button>
           )}

          {/* Welcome-back card — gentle nudge after inactivity (>= 2 days). §9 clears it. */}
          {/* Welcome back — capped by priority system */}
          {visibleNudgeIds.has("welcome") && welcomeBack && (
            <WelcomeBackCard
              lastVisitDate={welcomeBack}
              onDismiss={() => nudges.dismissWelcome()}
            />
          )}

          {/* #30 (audit): pact surface — the user's own letter + a tap-to-text handoff, when a real shift
              is noticed. §9 takes precedence (cleared in openCrisis). */}
          {/* Pact notice — capped by priority system */}
          {visibleNudgeIds.has("pact") && pactNotice && (
            <PactNoticeCard
              notice={pactNotice}
              onDismiss={() => nudges.dismissPact()}
            />
          )}

          {/* Quick suggestion chips — tap to send */}
{messages.length <= 1 && !inputText && (
            <div className="flex flex-wrap gap-2" id="chat-suggestions">
              {suggestions.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => handleSendMessage(chip.text)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  <chip.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {chip.text}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
{showTextInput ? (
              <>
                <button
                  onClick={handleVoice}
                  className={`p-3 rounded-full transition-colors cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring ${
                    listening
                      ? "bg-rose-500/20 text-rose-400 animate-pulse"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                  aria-label={listening ? "Stop listening" : "Tap to talk"}
                >
                  {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <input
                  id="chat-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    chatTyping.onKeyDown(e);
                    if (e.key === "Enter") handleSendMessage();
                  }}
                  onKeyUp={chatTyping.onKeyUp}
                  onBlur={() => chatTyping.onBlur(inputText.length)}
                  onFocus={chatTyping.start}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || loading}
                  className={`p-3 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring ${
                    inputText.trim() && !loading
                      ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      : "bg-slate-800 text-slate-500"
                  }`}
                  aria-label="Send"
                >
                  <Send className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { if (!listening) setShowTextInput(false); }}
                  className="p-3 rounded-xl bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring"
                  aria-label="Hide keyboard, show voice"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleVoice}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all cursor-pointer min-h-[44px] focus-ring ${
                    listening
                      ? "bg-rose-500/20 text-rose-400 animate-pulse"
                      : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-slate-100"
                  }`}
                  aria-label={listening ? "Tap to stop listening" : "Tap to speak"}
                >
                  {listening ? (
                    <><MicOff className="w-6 h-6" /><span className="text-sm font-semibold">Listening — tap to stop</span></>
                  ) : (
                    <><Mic className="w-6 h-6" /><span className="text-sm font-semibold">Tap to speak</span></>
                  )}
                </button>
                <button
                  onClick={() => setShowTextInput(true)}
                  className="p-3 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring"
                  aria-label="Type a message"
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

      {/* #9 (audit): the §9 crisis overlay is now rendered once at the App level (back-button aware) and
          opened via onOpenCrisis() / openCrisis() above — no duplicate local overlay that the hardware back
          button couldn't see (which previously exited the app during a crisis). */}

      {/* Aux view sheets — the capture-sheet registry (Phase 4 slice 1). auxView + drafts + the
          onInternalSheetChange / closeSheetSignal wiring stay here; CaptureSheets only renders the active
          sheet and clears ITS draft on close (each screen paired with its draft-clear so they can't desync). */}
      <CaptureSheets
        auxView={auxView}
        thoughtRecordDraft={thoughtRecordDraft}
        problemDraft={problemDraft}
        valuesHighlight={valuesHighlight}
        safetyPlanDraft={safetyPlanDraft}
        onClose={() => setAuxView(null)}
        clearThoughtRecordDraft={() => setThoughtRecordDraft(undefined)}
        clearProblemDraft={() => setProblemDraft(undefined)}
        clearValuesHighlight={() => setValuesHighlight([])}
        clearSafetyPlanDraft={() => setSafetyPlanDraft(undefined)}
      />
    </div>
  );
}
