// ModeScreen — the living interface that adapts to time + user state.
// Replaces the static stream with a mode-based UI.

import { useState, useEffect, useMemo, useRef } from "react";
import NilaFace from "./NilaFace";
import NilaDot from "./NilaDot";
import CrisisHeaderButton from "./CrisisHeaderButton";
import QuickActions from "./QuickActions";
import {
  getCurrentMode,
  getGreeting,
  getNilaQuestion,
} from "../services/modeEngine";
import { clearChatElevation, noteChatElevation } from "../services/chatElevation";
import { detectElevationRisk } from "../services/elevationGuard";
import { scoreAffect, affectAccentActive } from "../services/affectHead";
import { blendAffect } from "../services/affectBlend";
import { noteChatAffect } from "../services/chatAffect";
import { stripProvenance } from "../services/emotionParse";
import { t } from "../services/i18n";
import { WELCOME_SEED, STATE_MESSAGES } from "../services/personaConfig";
import { useTypingSession } from "../hooks/useTypingSession";
import { getSuggestions, timeSlot } from "../services/chatSuggestions";
import { stripChatMarkdown, ensureListBreaks } from "../services/chatText";
import { deriveInMomentInsight } from "../services/inMomentInsight";
import { type Skill } from "../services/skillsLibrary";
import NilaCheckIn from "./NilaCheckIn";
import ChatLoading from "./ChatLoading";
import InMomentInsightCard from "./InMomentInsightCard";
import PactNoticeCard from "./PactNoticeCard";
import WelcomeBackCard from "./welcomeBack";
import type { CheckInEntry } from "../types";
import { sendToNila } from "../services/sendToNila";
import { NilaUiMessage, shouldBlockForCrisisAsync } from "../services/nilaSend";
import { notifyReplyReady } from "../services/notifications";
import SoftCrisisCard from "./SoftCrisisCard";
import { getSessionChat, clearSessionChat } from "../services/sessionChat";
import { localLlmLoadState } from "../services/localLlm";
import { offlineBrainMessage } from "../services/nilaReflect";
import { safeDraftThoughtRecord, type ThoughtRecordDraft } from "../services/thoughtRecordDraft";
import { safeDraftProblem } from "../services/problemSolvingDraft";
import { safeDraftValueDomains } from "../services/valuesDraft";
import { safeDraftSafetyPlan, type SafetyPlanDraftFields } from "../services/safetyPlanDraft";
import CaptureSheets from "./CaptureSheets";
import { type CaptureSheetId } from "../services/navStore";
import { selectVisibleNudges } from "./nudgeSelection";
import NudgeRail from "./NudgeRail";
import { useNudges } from "../hooks/useNudges";
import { useCheckinGate } from "../hooks/useCheckinGate";
import { useCrisisGate } from "../hooks/useCrisisGate";
import { useMessageFeedback } from "../hooks/useMessageFeedback";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { looksLikeArmRequest, requestArmedCheckin } from "../services/armedCheckin";
import { protocolOfferCard, startProtocolChat, continueProtocolChat, stepUpOffer, type ProtocolCard } from "../services/protocolChat";
import { abandonProtocol } from "../services/protocolProgress";
import { logNilaTurn } from "../services/nilaSessions";
import { speakIfEnabled, speak, listenOnce, stopSpeaking } from "../services/voice";
import { startVoiceSession, endVoiceSession } from "../services/voicePatterns";
import { checkSttCoherence } from "../services/sttCoherenceGate";
import { Settings, Mic, Send, MicOff, Keyboard, X, ThumbsUp, ThumbsDown, Clock, Square } from "lucide-react";
import RatingPromptCard from "./RatingPromptCard";
import { hapticLight, hapticMedium } from "../hooks/useHaptics";
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
  // Capture sheet presence lives in the nav overlay stack (Phase 3): App passes which capture is open (or
  // null) + open/close dispatchers. The §9-gated DRAFTS stay local to ModeScreen (below). Replaces the old
  // onInternalSheetChange/closeSheetSignal bridge.
  activeCapture?: CaptureSheetId | null;
  onOpenCapture?: (id: CaptureSheetId) => void;
  onCloseCapture?: () => void;
}

// #22 (audit): App wraps <main> in key={activeTab}, so switching tabs fully remounts ModeScreen and its
// useState resets — a half-typed message was lost on any tab round-trip. This module-level cache preserves the
// in-progress draft across remounts (keeps the tab crossfade animation, unlike dropping the key).
let modeDraftCache = "";

function msg(role: "user" | "assistant", content: string, extra: Partial<Pick<NilaUiMessage, "insight" | "synthetic">> = {}): NilaUiMessage {
  return { role, content, timestamp: Date.now(), ...extra };
}


export default function ModeScreen({ onOpenSettings, onOpenCrisis, onOpenDashboard, onOpenMedication, onOpenGrounding, onOpenDiary, onOpenReachOut, onOpenWindDown, activeCapture = null, onOpenCapture, onCloseCapture }: ModeScreenProps) {
  const [mode, setMode] = useState(getCurrentMode());
  const [affectAccent, setAffectAccent] = useState<{ valence: number; arousal: number } | null>(null);
  const { showCheckin, hideCheckin } = useCheckinGate(mode.hasCheckedIn);
  const [messages, setMessages] = useState<NilaUiMessage[]>(() => {
    // Restore saved session if one exists (survives app restart)
    const saved = getSessionChat();
    if (saved.length) return saved;
    // Seed a warm greeting on first launch — so the chat is never blank.
    // Previously messages started empty and the user had to type first.
    return [msg("assistant", WELCOME_SEED)];
  });
  const [inputText, setInputText] = useState(() => modeDraftCache); // #22: restore draft after a tab-switch remount
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const auxView = activeCapture; // capture-sheet presence now comes from the nav overlay stack (Phase 3)
  const [thoughtRecordDraft, setThoughtRecordDraft] = useState<ThoughtRecordDraft | undefined>();
  const [problemDraft, setProblemDraft] = useState<{ problem: string } | undefined>();
  const [valuesHighlight, setValuesHighlight] = useState<string[]>([]);
  const [safetyPlanDraft, setSafetyPlanDraft] = useState<SafetyPlanDraftFields | undefined>();
  const [protocolCard, setProtocolCard] = useState<ProtocolCard | null>(() => protocolOfferCard(""));
  const [confirmNewChat, setConfirmNewChat] = useState(false); // "new conversation" confirm dialog
  const [showNudgePanel, setShowNudgePanel] = useState(true); // collapsible nudge section
  const [removableToastIndex, setRemovableToastIndex] = useState<number | null>(null); // U7.5
  const [expandedFeedbackIndices, setExpandedFeedbackIndices] = useState<Set<number>>(new Set()); // U7.6
  const [suggestionChipsExpanded, setSuggestionChipsExpanded] = useState(false); // U7.7
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
  // clinical priority — the ~48h Stanley-Brown follow-up matters most) to ONE card, then the visual cap
  // (NUDGE_CAP=3) is managed inside NudgeRail with an expand toggle (+N more). Pure selection lives in
  // nudgeSelection.ts, unit-tested for priority order.
  const { safetyPlanCard, visibleNudgeIds, totalNudges } = selectVisibleNudges({
    safetyPlanFollowUp: showSafetyPlanFollowUp,
    safetyPlanReview: showSafetyPlanReview,
    calmSafetyNudgeShow: !!calmSafetyNudge?.show,
    sleepProdrome: !!sleepProdromeNudge,
    jitaiShouldNudge: !!jitaiNudge?.shouldNudge,
    pact: !!pactNotice,
    welcome: !!welcomeBack,
  });

  // Per-message thumbs up/down + the "what would've helped?" suggestion flow + skill dismissal — a
  // self-contained, §9-free concern extracted to useMessageFeedback (Phase 4 slice 4b).
  const feedback = useMessageFeedback();
  const { ratedMessages, dismissedSkillMessages, suggestionPrompt, suggestionText } = feedback;
  // #4 + #9 (audit): §9 crisis now routes through the App-level overlay (onOpenCrisis) so the Android hardware
  // back button closes it instead of exiting the app; a session that ever tripped §9 latches hadCrisisRef so
  // the transcript is never persisted/restored (keying the clear on a transient boolean re-persisted it on dismiss).
  // hadCrisisRef itself is declared above (before useNudges, which reads it).
  const crisisPendingRef = useRef(false); // #5-out (re-audit): a sent turn whose async §9 verdict is still pending
  const abortRef = useRef<AbortController | null>(null);
  const cancelRequestedRef = useRef(false); // U7.1: set when user taps cancel; checked in catch to skip fallback
  // The §9 crisis + chat-persistence seam — openCrisis(), softCrisisCard, and the persist/restore effects —
  // lives in useCrisisGate (Phase 4 slice 4a). hadCrisisRef + crisisPendingRef are OWNED here and passed in
  // (single objects; handleSendMessage / startNewConversation still mutate them directly). `messages` also
  // stays owned here (it is read by useNudges, the selector, protocol handlers, and the render).
  const { softCrisisCard, setSoftCrisisCard, openCrisis } = useCrisisGate({
    hadCrisisRef,
    crisisPendingRef,
    messages,
    setMessages,
    onOpenCrisis,
    clearNudges: nudges.clearForCrisis,
    clearProtocol: () => setProtocolCard(null),
  });
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

  // U7.5: auto-dismiss "Remove from history" toast after 5s
  useEffect(() => {
    if (removableToastIndex === null) return;
    const id = setTimeout(() => setRemovableToastIndex(null), 5000);
    return () => clearTimeout(id);
  }, [removableToastIndex]);

  // Capture-sheet presence now lives in the nav overlay stack (Phase 3), so the old onInternalSheetChange +
  // closeSheetSignal bridge is gone. Drop the §9-gated drafts whenever no capture is open — i.e. when the
  // sheet closes (via its X, or the hardware-back CLOSE_TOP, or a chained open elsewhere). The opener sets a
  // draft THEN dispatches openCapture, so activeCapture is non-null by the time this runs on open (no wipe).
  useEffect(() => {
    if (!activeCapture) {
      setThoughtRecordDraft(undefined);
      setProblemDraft(undefined);
      setValuesHighlight([]);
      setSafetyPlanDraft(undefined);
    }
  }, [activeCapture]);

  // (B3 safety-plan review/follow-up + C1 sleep-prodrome/JITAI/calm-moment nudge effects moved to
  //  useNudges — Phase 4 slice 2b. Behaviour, deps, and the 5-min poll are unchanged.)

  // (#30 pact-surface + welcome-back one-shot effects moved to useNudges — Phase 4 slice 2b.
  //  CHAT PERSISTENCE restore + persist effects + the "never persist a §9 crisis turn" invariant moved to
  //  useCrisisGate — Phase 4 slice 4a. handleSendMessage still toggles crisisPendingRef around the model call.)

  const handleCheckinLogged = (entry: CheckInEntry) => {
    hideCheckin();
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
      msg("user", checkinSummary),
      msg("assistant", "Thank you. I'll keep that in mind."),
    ]);
  };

  const handleCheckinSkip = () => {
    hideCheckin();
  };

  const handleCancelGeneration = () => {
    cancelRequestedRef.current = true;
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  };

  const handleRemoveFromHistory = (index: number) => {
    setMessages((prev) => [...prev.slice(0, index), ...prev.slice(index + 2)]);
    setRemovableToastIndex(null);
  };

  const handleSendMessage = async (text?: string) => {
    const textToSend = text || inputText.trim();
    if (!textToSend || loading) return;

    chatTyping.stop(textToSend.length);
    setInputText("");
    hapticLight();
    const userMsg: NilaUiMessage = msg("user", textToSend);
    crisisPendingRef.current = true; // #5-out: hold this turn out of sessionChat until its §9 verdict returns
    setMessages((prev) => [...prev, userMsg]);
    logNilaTurn("coach", textToSend); // dashboard "Nila chats" — was never wired for the main tab (2026-07-12 QA).
    // Counted BEFORE the §9 gate below: a crisis-blocked message is still a real turn the user reached out
    // with. Only the user's own text is stored (never the AI reply), same as the Episode surface.

    // Armed check-in is a deterministic, opt-in command — handle it before the model.
    if (looksLikeArmRequest(textToSend)) {
      // Bug 3 fix (2026-07-12, adversarial review): this branch never set `loading` before its await below,
      // unlike the main send path (setLoading(true) at the top of that try, further down). That left the
      // Send button enabled during the pending §9 check, so a second message could be sent concurrently and
      // interleave with this turn's still-pending verdict. Match the main path's re-entrancy guard.
      setLoading(true);
      try {
        // #3 (audit): the arm path gates with keyword-only scanForCrisis, so a euphemistic crisis that also
        // matches the arm-request regex ("check on me… the world would feel lighter without me") would get a
        // cheerful check-in confirmation. Run the full classifier-backed §9 gate here first.
        if (await shouldBlockForCrisisAsync(textToSend)) { openCrisis(true); return; }
        crisisPendingRef.current = false; // arm request cleared the §9 gate — not a crisis, safe to persist
        const armResult = requestArmedCheckin(textToSend, [...messages, userMsg]);
        if (armResult.ok) {
          setMessages((prev) => [
            ...prev,
            msg("assistant", `Got it — I'll check in with you ${armResult.triggerLabel}.`),
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
            setMessages((prev) => [...prev, msg("assistant", reply)]);
          }
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // Surface a protocol offer/continue card (§9-gated inside protocolOfferCard).
    setProtocolCard(protocolOfferCard(textToSend));

    setLoading(true);
    const abortController = new AbortController();
    abortRef.current = abortController;
    cancelRequestedRef.current = false;

    try {
      const allMessages = [...messages, userMsg];
      const result = await sendToNila(allMessages, "companion", {
        onDelta: (t: string) => {},
        signal: abortController.signal,
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
        if (result.reply) setMessages((prev) => [...prev, msg("assistant", result.reply)]);
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
      noteChatElevation(detectElevationRisk(textToSend).level);
      // Per-turn affect accent (Phase 1, additive) — off by default (affectAccentActive() requires both
      // setAffectAccentEnabled(true) AND an injected embedder; see main.tsx). scoreAffect() already
      // fails closed (returns null on any error), so no extra try/catch is needed here.
      let turnAffectAccent: { valence: number; arousal: number } | null = null;
      if (affectAccentActive() && result.reply) {
        const [userScore, nilaScore] = await Promise.all([scoreAffect(textToSend), scoreAffect(result.reply)]);
        if (userScore && nilaScore) {
          turnAffectAccent = blendAffect(userScore, nilaScore);
          noteChatAffect(turnAffectAccent);
        }
      }
      setAffectAccent(turnAffectAccent);
      const previousExplainerId =
        [...messages].reverse().find((m) => m.role === "assistant")?.insight?.explainer?.id ?? null;
      const insight = await deriveInMomentInsight(textToSend, mode.userState, previousExplainerId);
      if (result.reply) {
        setMessages((prev) => [...prev, msg("assistant", result.reply, { insight: insight ?? undefined })]);
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
        setMessages((prev) => [...prev, msg("assistant", content)]);
      }
      // After Nila replies, refresh the protocol card (continue if active, else re-offer).
      setProtocolCard(protocolOfferCard(textToSend));
      // Chat-detected elevation may have latched during this turn (localNila → noteChatElevation) — recompute
      // the mode so the interface settles (orb slows, home thins) in response to what the user just typed.
      setMode(getCurrentMode());
      // U7.5: show "Remove from history" toast for the latest user+reply pair
      setRemovableToastIndex(messages.length);
    } catch (err) {
      crisisPendingRef.current = false; // model error is not a §9 crisis — let the turn persist
      if (cancelRequestedRef.current) {
        cancelRequestedRef.current = false;
        setLoading(false);
        return;
      }
      const isCloud = isCloudApiEnabled() && getCloudApiKey();
      const fallbackText = isCloud
        ? "Cloud API isn't responding — check your API key and endpoint in Settings → Advanced → Cloud API. Your conversations are still private on-device in the meantime."
        : "I'm having a quiet moment — my model isn't responding right now. Your phone might be low on memory or the model needs a moment. Try typing again? 💙";
      setMessages((prev) => [
        ...prev,
        msg("assistant", fallbackText),
      ]);
    } finally {
      setLoading(false);
      abortRef.current = null;
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
            msg("user", text),
            msg("assistant", "I didn't quite catch that — could you say that again?"),
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
    onOpenCapture?.("thought_record");
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
    onOpenCapture?.("problem_solving");
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
    onOpenCapture?.("values_to_action");
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
    onOpenCapture?.("safety_plan");
  };

  const handleOpenSafetyPlan = () => {
    onOpenCapture?.("safety_plan");
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
          msg("assistant", `You've completed ${result.title}. Nice work — small steps add up.`),
        ]);
        setProtocolCard(stepUpOffer(result.id));
      } else if (result.kind === "advanced") {
        setMessages((prev) => [...prev, msg("assistant", result.prompt)]);
        setProtocolCard(protocolOfferCard(""));
      } else {
        // Protocol state is stale/corrupted — clear it and offer a fresh start
        setProtocolCard(null);
        abandonProtocol();
        setMessages((prev) => [...prev, msg("assistant", "Let's pick that up fresh — whenever you're ready.")]);
      }
    } else {
      const result = startProtocolChat(protocolCard.protocolId);
      if (result.kind === "started") {
        setMessages((prev) => [...prev, msg("assistant", result.prompt)]);
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
      msg("assistant", `**${skill.name}** — ${skill.purpose}\n\n${steps}\n\nTake your time with this. Even a small try counts. 💙`),
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
            msg("assistant", "Did you take your medication today?"),
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
        onOpenCapture?.("learn");
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
          setMessages((prev) => [...prev, msg("assistant", result.prompt)]);
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
    feedback.reset();
    setProtocolCard(protocolOfferCard(""));
    hadCrisisRef.current = false;
    setConfirmNewChat(false);
  };

  return (
    <div className="flex flex-col h-full bg-page">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line/50" style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{greeting}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full hover:bg-fill text-ink-muted hover:text-ink-2 transition-colors cursor-pointer focus-ring min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={t("settings")}
          >
            <Settings className="w-4 h-4" />
          </button>
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
            className="w-full max-w-xs rounded-2xl bg-slate-900 border border-line-strong p-5 space-y-3 outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-ink">Start a new conversation?</p>
            <p className="text-xs text-ink-muted">
              This clears the current chat from your device. Nila won't carry what was said here into the new one.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setConfirmNewChat(false)}
                className="flex-1 py-3 rounded-xl bg-fill text-ink-2 text-sm cursor-pointer hover:bg-line-strong transition-colors min-h-[44px] focus-ring"
              >
                Keep it
              </button>
              <button
                onClick={startNewConversation}
                className="flex-1 py-3 rounded-xl text-white text-sm cursor-pointer transition-opacity hover:opacity-90 min-h-[44px] focus-ring"
                style={{ backgroundColor: "#C784B0" }}
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content — scrollable for chat messages */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-4 p-4 pt-8">
        {/* Check-in card — dismissable, sits above the chat */}
        {showCheckin && (
          <div className="w-full max-w-sm relative">
            <button
              onClick={handleCheckinSkip}
              className="absolute top-2 right-2 z-10 p-1.5 rounded-lg text-ink-faint hover:text-ink-2 hover:bg-fill/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Skip check-in"
            >
              <X className="w-4 h-4" />
            </button>
            <NilaCheckIn onLogged={handleCheckinLogged} onSkip={handleCheckinSkip} />
          </div>
        )}

        {/* Compact Nila presence — orb (100px) + question side by side */}
        <div className="w-full max-w-sm flex items-start gap-4">
          <NilaFace
            state={mode.userState}
            onClick={handleVoice}
            onLongPress={() => openCrisis()}
            size={100}
            isListening={listening}
            affectAccent={affectAccent}
          />
          <div className="flex-1 min-w-0 pt-2">
            <p className="text-base text-ink-2 font-display leading-snug">{question}</p>
            {mode.userState && mode.userState !== "calm" && (
              <p className="text-xs text-ink-muted mt-1">
                {mode.userState === "anxious" && STATE_MESSAGES.anxious}
                {mode.userState === "low" && STATE_MESSAGES.low}
                {mode.userState === "elevated" && STATE_MESSAGES.elevated}
              </p>
            )}
          </div>
        </div>

        {/* Quick actions — always visible, no toggle */}
        <div className="w-full max-w-sm">
          <QuickActions onAction={handleQuickAction} timeMode={mode.timeMode} userState={mode.userState} />
        </div>

        {/* Messages — full conversation with warm bubbles, timestamps, avatar, inline thumbs */}
        {messages.length > 0 && (
          <div className="w-full max-w-sm space-y-4" role="log" aria-live="polite">
            {messages.map((m, i) => {
              const ts = m.timestamp
                ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : null;
              return (
                <div key={i} className={`flex items-end gap-2 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {m.role === "assistant" && (
                    <div className="mb-4" aria-label="Nila">
                      <NilaDot size={14} />
                    </div>
                  )}
                  <div className={`max-w-[78%] ${m.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-purple-500/80 to-violet-600/80 text-white rounded-br-md"
                          : "bg-[#C784B0]/5 text-ink-2 border border-[#C784B0]/15 border-l-[3px] border-l-[#C784B0] rounded-bl-md"
                      }`}
                    >
                      {m.role === "user" ? m.content : ensureListBreaks(stripChatMarkdown(m.content))}
                    </div>
                    <div className={`flex items-center gap-2 mt-1 ${m.role === "user" ? "justify-end" : ""}`}>
                      {ts && <span className="text-[10px] text-ink-faint">{ts}</span>}
                      {m.role === "assistant" && (
                        <button
                          onClick={() => setExpandedFeedbackIndices((prev) => {
                            const next = new Set(prev);
                            if (next.has(i)) next.delete(i); else next.add(i);
                            return next;
                          })}
                          className="text-[11px] text-ink-faint hover:text-ink-2 underline transition-colors cursor-pointer min-h-[32px] focus-ring"
                          aria-label={expandedFeedbackIndices.has(i) ? "Hide feedback" : "Show feedback"}
                        >
                          {expandedFeedbackIndices.has(i) ? "−Feedback" : "+Feedback"}
                        </button>
                      )}
                    </div>
                    {m.role === "assistant" && expandedFeedbackIndices.has(i) && (
                      <>
                        {!ratedMessages.has(i) && (
                          <div className="flex gap-1 mt-1">
                            <button
                              onClick={() => feedback.rateUp(m.content, i)}
                              className="p-2 rounded text-ink-faint hover:text-ink-2 hover:bg-fill/50 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                              aria-label="Mark as helpful"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => feedback.rateDown(m.content, i)}
                              className="p-2 rounded text-ink-faint hover:text-ink-2 hover:bg-fill/50 transition-colors cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                              aria-label="Mark as not helpful"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {m.insight && (
                          <InMomentInsightCard
                            explainerTitle={m.insight.explainer?.title ?? ""}
                            explainerSummary={m.insight.explainer?.summary ?? ""}
                            explainerBasis={m.insight.explainer?.basis ?? ""}
                            skillEmoji={m.insight.skill?.emoji ?? ""}
                            skillName={m.insight.skill?.skill.name ?? ""}
                            skillReason={m.insight.skill?.reason ?? ""}
                            skillDismissed={dismissedSkillMessages.has(i)}
                            onDismissSkill={() => feedback.dismissSkill(i)}
                            onTrySkill={
                              m.insight.skill
                                ? () => handleTrySkill(m.insight!.skill!.skill)
                                : undefined
                            }
                          />
                        )}
                        {suggestionPrompt?.index === i && (
                          <div
                            id="feedback-suggestion-prompt"
                            className="mt-1.5 p-2.5 rounded-lg bg-fill/50 border border-line-strong text-xs space-y-2"
                          >
                            <p className="text-ink-2">What would've helped?</p>
                            <input
                              type="text"
                              value={suggestionText}
                              onChange={(e) => feedback.setSuggestionText(e.target.value)}
                              placeholder="What would've helped? (optional)"
                              className="w-full px-2.5 py-2 rounded-md bg-slate-900/70 border border-line-strong text-ink-2 placeholder:text-ink-faint focus-ring"
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => feedback.cancelSuggestion()}
                                className="px-3 py-2 rounded-md text-ink-muted hover:text-ink-2 hover:bg-line-strong/50 transition-colors cursor-pointer min-h-[44px] focus-ring"
                                aria-label="Not now"
                              >
                                Not now
                              </button>
                              <button
                                onClick={() => feedback.submitSuggestion()}
                                className="px-3 py-2 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
                                aria-label="Share what would help"
                              >
                                Share
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Chat loading — skeleton shimmer + typing dots */}
        {loading && <ChatLoading onCancel={handleCancelGeneration} />}

        {/* U7.5: "Remove from history" toast — shows for 5s after a successful send */}
        {removableToastIndex !== null && (
          <div className="w-full max-w-sm flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-800 border border-line-strong shadow text-xs">
            <span className="text-ink-muted">Nila already saw this — remove from view only</span>
            <button
              onClick={() => handleRemoveFromHistory(removableToastIndex)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium transition-colors cursor-pointer min-h-[44px] focus-ring"
              aria-label="Remove from history"
            >
              Remove from history
            </button>
          </div>
        )}

        {/* Rating prompt — shown after enough Nila conversations */}
        <RatingPromptCard />

        {/* #23 (audit): scroll anchor so a new reply is always brought into view. */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — always visible, unified voice+text */}
      <div className="px-4 py-3 border-t border-line/50 bg-page/95 backdrop-blur-sm space-y-2">
        {/* Soft crisis card — inline surface for classifier-only §9 hit */}
        {softCrisisCard && (
          <SoftCrisisCard
            onEscalate={() => { setSoftCrisisCard(false); onOpenCrisis?.(); }}
            onDismiss={() => setSoftCrisisCard(false)}
          />
        )}

        {/* Nudge rail + protocol card + welcome/pact — priority-collapsed */}
        <NudgeRail
          visibleNudgeIds={visibleNudgeIds}
          safetyPlanCard={safetyPlanCard}
          totalNudges={totalNudges}
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

        {(() => {
          const nudgeItems: { key: string; el: React.ReactNode }[] = [];
          if (protocolCard) nudgeItems.push({ key: "protocol", el: (
            <button
              onClick={handleProtocolTap}
              className="w-full text-left px-4 py-3 rounded-xl bg-[#C784B0]/10 border border-[#C784B0]/30 text-[#C784B0] text-xs font-medium hover:bg-[#C784B0]/20 transition-colors cursor-pointer min-h-[44px] focus-ring"
              id="protocol-card"
            >
              <span className="block">{protocolCard.label}</span>
              <span className="block mt-1 text-[10px] font-normal text-[#C784B0]/70">{protocolCard.basis}</span>
            </button>
          )});
          if (visibleNudgeIds.has("welcome") && welcomeBack) nudgeItems.push({ key: "welcome", el: (
            <WelcomeBackCard lastVisitDate={welcomeBack} onDismiss={() => nudges.dismissWelcome()} />
          )});
          if (visibleNudgeIds.has("pact") && pactNotice) nudgeItems.push({ key: "pact", el: (
            <PactNoticeCard notice={pactNotice} onDismiss={() => nudges.dismissPact()} />
          )});
          const collapsed = nudgeItems.length >= 2;
          const visible = collapsed ? showNudgePanel : true;
          return nudgeItems.length > 0 ? (
            <div className="space-y-2">
              {collapsed && (
                <button
                  onClick={() => setShowNudgePanel(!showNudgePanel)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-fill/50 text-xs text-ink-muted hover:text-ink-2 transition-colors cursor-pointer min-h-[44px] focus-ring"
                >
                  <span>{nudgeItems.length} notification{nudgeItems.length > 1 ? "s" : ""}</span>
                  <span className={`transition-transform duration-200 ${visible ? "rotate-180" : ""}`}>▾</span>
                </button>
              )}
              {visible && nudgeItems.map((item) => <div key={item.key}>{item.el}</div>)}
            </div>
          ) : null;
        })()}

        {/* Suggestion chips — capped at 2 with "+N more" toggle (U7.7, Mohr's ≤4 limit) */}
        <div className={`flex flex-wrap gap-2 transition-opacity duration-200 ${inputText.length > 0 || loading ? "opacity-30 pointer-events-none" : ""}`} id="chat-suggestions">
          {(suggestionChipsExpanded ? suggestions : suggestions.slice(0, 2)).map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleSendMessage(chip.text)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-fill border border-line-strong text-xs text-ink-2 hover:bg-line-strong hover:text-ink transition-colors cursor-pointer min-h-[44px] focus-ring"
            >
              <chip.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {chip.text}
            </button>
          ))}
          {suggestions.length > 2 && (
            <button
              onClick={() => setSuggestionChipsExpanded(!suggestionChipsExpanded)}
              className="px-3 py-2 rounded-full bg-fill border border-dashed border-line-strong text-xs text-ink-faint hover:text-ink-2 hover:border-slate-600 transition-colors cursor-pointer min-h-[44px] focus-ring"
              aria-label={suggestionChipsExpanded ? "Show fewer suggestions" : `Show ${suggestions.length - 2} more suggestions`}
            >
              {suggestionChipsExpanded ? `−Show fewer` : `+${suggestions.length - 2} more`}
            </button>
          )}
        </div>

        {/* Unified input: always-visible voice button + optional text input */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleVoice}
            disabled={loading}
            className={`p-3 rounded-full transition-colors cursor-pointer shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring ${
              listening
                ? "bg-rose-500/20 text-rose-400 animate-pulse"
                : loading
                ? "bg-fill text-ink-faint opacity-40 cursor-not-allowed"
                : "bg-fill text-ink-muted hover:text-ink-2"
            }`}
            aria-label={listening ? "Stop listening" : "Tap to talk"}
          >
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          {showTextInput ? (
            <>
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
                placeholder={loading ? "Waiting for Nila…" : "Type a message..."}
                disabled={loading}
                className="flex-1 bg-fill border border-line-strong rounded-xl px-4 py-2.5 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-[#C784B0] disabled:opacity-40"
              />
              <button
                onClick={loading ? handleCancelGeneration : () => handleSendMessage()}
                disabled={!loading && (!inputText.trim() || loading)}
                className={`p-3 rounded-xl transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring ${
                  loading
                    ? "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                    : inputText.trim()
                    ? "bg-[#C784B0]/20 text-[#C784B0] hover:bg-[#C784B0]/30"
                    : "bg-fill text-ink-faint"
                }`}
                aria-label={loading ? "Stop generating" : "Send"}
              >
                {loading ? <Square className="w-4 h-4" /> : <Send className="w-5 h-5" />}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setShowTextInput(true); }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-fill border border-dashed border-line-strong text-ink-muted hover:text-ink-2 hover:border-slate-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] focus-ring"
              aria-label="Tap to type"
            >
              <Keyboard className="w-5 h-5" />
              <span className="text-sm">{loading ? "Nila is replying…" : "Tap to type"}</span>
            </button>
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
        onClose={() => onCloseCapture?.()}
        clearThoughtRecordDraft={() => setThoughtRecordDraft(undefined)}
        clearProblemDraft={() => setProblemDraft(undefined)}
        clearValuesHighlight={() => setValuesHighlight([])}
        clearSafetyPlanDraft={() => setSafetyPlanDraft(undefined)}
      />
    </div>
  );
}
