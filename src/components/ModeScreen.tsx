// ModeScreen — the living interface that adapts to time + user state.
// Replaces the static stream with a mode-based UI.

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import NilaFace from "./NilaFace";
import Button from "./Button";
import {
  getCurrentMode,
  getGreeting,
  getNilaQuestion,
} from "../services/modeEngine";
import { clearChatElevation } from "../services/chatElevation";
import { stripProvenance } from "../services/emotionParse";
import { t } from "../services/i18n";
import { WELCOME_SEED, STATE_MESSAGES } from "../services/personaConfig";
import { useTypingSession } from "../hooks/useTypingSession";
import { getSuggestions, timeSlot } from "../services/chatSuggestions";
import { type Skill } from "../services/skillsLibrary";
import NilaCheckIn from "./NilaCheckIn";
import NilaHeader from "./NilaHeader";
import MessageList from "./MessageList";
import { useChatSend } from "../hooks/useChatSend";
import ChatLoading from "./ChatLoading";
import type { CheckInEntry } from "../types";
import { NilaUiMessage } from "../services/nilaSend";
import SoftCrisisCard from "./SoftCrisisCard";
import { getSessionChat, clearSessionChat } from "../services/sessionChat";
import { localLlmLoadState } from "../services/localLlm";
import { safeDraftThoughtRecord, type ThoughtRecordDraft } from "../services/thoughtRecordDraft";
import { safeDraftProblem } from "../services/problemSolvingDraft";
import { safeDraftValueDomains } from "../services/valuesDraft";
import { safeDraftSafetyPlan, type SafetyPlanDraftFields } from "../services/safetyPlanDraft";
import CaptureSheets from "./CaptureSheets";
import { type CaptureSheetId } from "../services/navStore";
import { useNudges } from "../hooks/useNudges";
import { useCheckinGate } from "../hooks/useCheckinGate";
import { useCrisisGate } from "../hooks/useCrisisGate";
import { useMessageFeedback } from "../hooks/useMessageFeedback";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { protocolOfferCard, startProtocolChat, continueProtocolChat, stepUpOffer, type ProtocolCard } from "../services/protocolChat";
import { abandonProtocol } from "../services/protocolProgress";
import { speakIfEnabled, listenOnce, stopSpeaking } from "../services/voice";
import { startVoiceSession, endVoiceSession } from "../services/voicePatterns";
import { checkSttCoherence } from "../services/sttCoherenceGate";
import { Mic, Send, MicOff, Keyboard, X, Square, Wind, Snowflake } from "lucide-react";

import { hapticMedium } from "../hooks/useHaptics";

interface ModeScreenProps {
  onOpenSettings?: () => void;
  onOpenCrisis?: () => void;
  onOpenDashboard?: () => void;
  onOpenMedication?: () => void;
  onOpenGrounding?: (expandIndex?: number) => void;
  onOpenDiary?: () => void;
  onOpenReachOut?: () => void;
  onOpenWindDown?: () => void;
  activeCapture?: CaptureSheetId | null;
  onOpenCapture?: (id: CaptureSheetId) => void;
  onCloseCapture?: () => void;
}

const modeDraftRef = { current: "" };

function msg(role: "user" | "assistant", content: string, extra: Partial<Pick<NilaUiMessage, "insight" | "synthetic">> = {}): NilaUiMessage {
  return { role, content, timestamp: Date.now(), ...extra };
}


export default function ModeScreen({ onOpenSettings, onOpenCrisis, onOpenDashboard, onOpenMedication, onOpenGrounding, onOpenDiary, onOpenReachOut, onOpenWindDown, activeCapture = null, onOpenCapture, onCloseCapture }: ModeScreenProps) {
  const [mode, setMode] = useState(getCurrentMode());
  const [affectAccent, setAffectAccent] = useState<{ valence: number; arousal: number } | null>(null);
  const { showCheckin, hideCheckin } = useCheckinGate(mode.hasCheckedIn);
  const [messages, setMessages] = useState<NilaUiMessage[]>(() => {
    const saved = getSessionChat();
    if (saved.length) return saved;
    return [msg("assistant", WELCOME_SEED)];
  });
  const [inputText, setInputText] = useState(() => modeDraftRef.current);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const auxView = activeCapture;
  const [thoughtRecordDraft, setThoughtRecordDraft] = useState<ThoughtRecordDraft | undefined>();
  const [problemDraft, setProblemDraft] = useState<{ problem: string } | undefined>();
  const [valuesHighlight, setValuesHighlight] = useState<string[]>([]);
  const [safetyPlanDraft, setSafetyPlanDraft] = useState<SafetyPlanDraftFields | undefined>();
  const [protocolCard, setProtocolCard] = useState<ProtocolCard | null>(() => protocolOfferCard(""));
  const [confirmNewChat, setConfirmNewChat] = useState(false);
  const [removableToastIndex, setRemovableToastIndex] = useState<number | null>(null);

  // V1.3 — warm cold-start: show a friendly loading screen while the model boots
  const [modelLoadState, setModelLoadState] = useState<"loading" | "ready" | "error" | "none">("none");
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const state = await localLlmLoadState();
        if (!cancelled) setModelLoadState(state as "loading" | "ready" | "error" | "none");
      } catch { if (!cancelled) setModelLoadState("error"); }
    };
    check();
    const iv = setInterval(check, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);
  const [expandedFeedbackIndices, setExpandedFeedbackIndices] = useState<Set<number>>(new Set());
  const [suggestionChipsExpanded, setSuggestionChipsExpanded] = useState(false);
  const newChatConfirmRef = useFocusTrap<HTMLDivElement>(confirmNewChat, () => setConfirmNewChat(false));

  const hadCrisisRef = useRef(false);
  const nudges = useNudges({ messages, auxView, hadCrisisRef });

  const feedback = useMessageFeedback();
  const { ratedMessages, dismissedSkillMessages, suggestionPrompt, suggestionText } = feedback;
  const crisisPendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const cancelRequestedRef = useRef(false);
  const { softCrisisCard, setSoftCrisisCard, openCrisis } = useCrisisGate({
    hadCrisisRef,
    crisisPendingRef,
    messages,
    setMessages,
    onOpenCrisis,
    clearNudges: nudges.clearForCrisis,
    clearProtocol: () => setProtocolCard(null),
  });

  useEffect(() => { modeDraftRef.current = inputText; }, [inputText]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMode(getCurrentMode());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (removableToastIndex === null) return;
    const id = setTimeout(() => setRemovableToastIndex(null), 5000);
    return () => clearTimeout(id);
  }, [removableToastIndex]);

  useEffect(() => {
    if (!activeCapture) {
      setThoughtRecordDraft(undefined);
      setProblemDraft(undefined);
      setValuesHighlight([]);
      setSafetyPlanDraft(undefined);
    }
  }, [activeCapture]);

  const handleCheckinLogged = (entry: CheckInEntry) => {
    hideCheckin();
    clearChatElevation();
    setMode(getCurrentMode());
    hapticMedium();
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

  const handleRemoveFromHistory = (index: number) => {
    setMessages((prev) => [...prev.slice(0, index), ...prev.slice(index + 2)]);
    setRemovableToastIndex(null);
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
        const coherence = checkSttCoherence(text);
        if (!coherence.coherent) {
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
        openCrisis(true);
        return;
      }
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
        openCrisis(true);
        return;
      }
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
        openCrisis(true);
        return;
      }
      setValuesHighlight([]);
    } else {
      setValuesHighlight(result.domains);
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
        openCrisis(true);
        return;
      }
      setSafetyPlanDraft(undefined);
    } else {
      setSafetyPlanDraft(result.draft);
    }
    onOpenCapture?.("safety_plan");
  };

  const handleOpenSafetyPlan = () => {
    onOpenCapture?.("safety_plan");
  };

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
        onOpenGrounding?.(1);
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
  const recentMood = messages.length > 0 ? { intensity: 5, emotion: "" } : null;
  const suggestions = useMemo(() => getSuggestions(slot, recentMood), [slot, messages.length]);

  const chatTyping = useTypingSession("chat");
  const question = getNilaQuestion(mode.timeMode, mode.userState, mode.hasCheckedIn);

  const recomputeMode = useCallback(() => setMode(getCurrentMode()), []);

  const { handleSendMessage, handleCancelGeneration } = useChatSend({
    inputText,
    setInputText,
    loading,
    setLoading,
    messages,
    setMessages,
    setProtocolCard,
    protocolCard,
    setSoftCrisisCard,
    modeUserState: mode.userState,
    recomputeMode,
    setAffectAccent,
    openCrisis,
    chatTyping,
    setRemovableToastIndex,
    cancelRequestedRef,
    abortRef,
    crisisPendingRef,
  });

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
      {/* V1.3 — warm cold-start: friendly loading screen while model boots */}
      {modelLoadState === "loading" && messages.length <= 1 && !loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <NilaFace size={120} state="calm" />
          <p className="text-ink-2 text-sm text-center">Nila is getting ready…</p>
          <div className="flex gap-1.5 mt-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      ) : (
      <>
      <NilaHeader greeting={greeting} onOpenSettings={onOpenSettings} onOpenCrisis={() => openCrisis()} />

      {/* New-conversation confirm */}
      {confirmNewChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Start a new conversation"
          onClick={() => setConfirmNewChat(false)}
        >
          <div
            ref={newChatConfirmRef}
            tabIndex={-1}
            className="w-full max-w-xs rounded-2xl bg-card border border-line-strong p-6 space-y-4 outline-none shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-ink">Start a new conversation?</p>
            <p className="text-base text-ink-muted leading-relaxed">
              This clears the current chat from your device. Nila won't carry what was said here into the new one.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setConfirmNewChat(false)}
                className="flex-1 py-3 rounded-xl bg-fill text-ink-2 text-sm font-medium cursor-pointer hover:bg-line-strong transition-colors min-h-[44px] focus-ring"
              >
                Keep it
              </button>
              <button
                onClick={startNewConversation}
                className="flex-1 py-3 rounded-xl sun-cta text-sm font-medium cursor-pointer transition-opacity hover:opacity-90 min-h-[44px] focus-ring"
              >
                Start fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-5 px-4 pt-6 pb-4">
        {showCheckin && (
          <div className="w-full max-w-sm relative animate-fade-up">
            <button
              onClick={handleCheckinSkip}
              className="absolute top-2 right-2 z-10 p-2 rounded-lg text-ink-faint hover:text-ink-2 hover:bg-fill/50 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Skip check-in"
            >
              <X className="w-4 h-4" />
            </button>
            <NilaCheckIn onLogged={handleCheckinLogged} onSkip={handleCheckinSkip} />
          </div>
        )}

        {/* Nila presence — compact inline layout */}
        <div className="w-full max-w-sm flex items-center gap-3 animate-fade-up px-2">
          <NilaFace
            state={mode.userState}
            onClick={handleVoice}
            onLongPress={() => openCrisis()}
            size={48}
            isListening={listening}
            affectAccent={affectAccent}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-ink-2 font-display leading-snug">{question}</p>
            {mode.userState && mode.userState !== "calm" && (
              <p className="text-xs text-ink-muted mt-0.5 leading-snug">
                {mode.userState === "anxious" && STATE_MESSAGES.anxious}
                {mode.userState === "low" && STATE_MESSAGES.low}
                {mode.userState === "elevated" && STATE_MESSAGES.elevated}
              </p>
            )}
          </div>
        </div>

        {/* Quick Calm — compact horizontal bar */}
        <div className="w-full max-w-sm flex gap-2 animate-fade-up" style={{ animationDelay: '60ms' }}>
          <Button variant="secondary" size="sm" onClick={() => onOpenGrounding?.(1)} className="flex-1 gap-1.5 py-2 text-xs">
            <Wind className="w-3.5 h-3.5" /> Breathe
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onOpenGrounding?.()} className="flex-1 gap-1.5 py-2 text-xs">
            <Snowflake className="w-3.5 h-3.5" /> Ground
          </Button>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          expandedFeedbackIndices={expandedFeedbackIndices}
          removableToastIndex={removableToastIndex}
          loading={loading}
          ratedMessages={ratedMessages}
          dismissedSkillMessages={dismissedSkillMessages}
          suggestionPrompt={suggestionPrompt}
          suggestionText={suggestionText}
          onToggleFeedback={(i) => setExpandedFeedbackIndices((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i); else next.add(i);
            return next;
          })}
          onRateUp={(content, i) => feedback.rateUp(content, i)}
          onRateDown={(content, i) => feedback.rateDown(content, i)}
          onDismissSkill={(i) => feedback.dismissSkill(i)}
          onTrySkill={handleTrySkill}
          onSetSuggestionText={(text) => feedback.setSuggestionText(text)}
          onSubmitSuggestion={() => feedback.submitSuggestion()}
          onCancelSuggestion={() => feedback.cancelSuggestion()}
          onRemoveFromHistory={handleRemoveFromHistory}
          onCancelGeneration={handleCancelGeneration}
        />

        {loading && <ChatLoading onCancel={handleCancelGeneration} />}

        {removableToastIndex !== null && (
          <div className="w-full max-w-sm flex flex-col gap-2 px-4 py-3 rounded-xl glass border border-line-strong shadow-lg text-xs animate-fade-up">
            <span className="text-ink-muted">Hiding from view — Nila has already seen this message.</span>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-ink-faint">This only hides it from your view.</span>
              <button
                onClick={() => handleRemoveFromHistory(removableToastIndex)}
                className="px-3 py-1.5 rounded-lg bg-danger/15 hover:bg-danger/25 text-rose-300 font-medium transition-all cursor-pointer min-h-[44px] focus-ring active:scale-95"
                aria-label="Hide this message from view"
                aria-describedby="hide-from-view-desc"
              >
                Hide from view
              </button>
            </div>
            <span id="hide-from-view-desc" className="sr-only">
              Nila has already processed this message. Hiding it only removes it from your visible chat history.
            </span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-line/40 bg-page/95 backdrop-blur-sm space-y-2.5 shrink-0">
        {softCrisisCard && (
          <SoftCrisisCard
            onEscalate={() => { setSoftCrisisCard(false); onOpenCrisis?.(); }}
            onDismiss={() => setSoftCrisisCard(false)}
          />
        )}

        {mode.userState === "calm" || mode.userState === null ? (
          <>
            {protocolCard && (
              <button
                onClick={handleProtocolTap}
                className="w-full text-left px-4 py-3 rounded-xl bg-accent/10 border border-accent/25 text-accent text-xs font-medium hover:bg-accent/20 transition-colors cursor-pointer min-h-[44px] focus-ring"
                id="protocol-card"
              >
                <span className="block">{protocolCard.label}</span>
                <span className="block mt-1 text-[10px] font-normal text-ink-muted">{protocolCard.basis}</span>
              </button>
            )}

            <div className={`flex flex-wrap gap-2 transition-opacity duration-200 ${inputText.length > 0 || loading ? "opacity-30 pointer-events-none" : ""}`} id="chat-suggestions">
              {(suggestionChipsExpanded ? suggestions.slice(0, 4) : suggestions.slice(0, 2)).map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => handleSendMessage(chip.text)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-card border border-line text-xs text-ink-2 hover:bg-fill hover:border-line-strong transition-colors cursor-pointer min-h-[44px] focus-ring active:scale-95"
                >
                  <chip.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {chip.text}
                </button>
              ))}
              {suggestions.length > 2 && (
                <button
                  onClick={() => setSuggestionChipsExpanded(!suggestionChipsExpanded)}
                  className="px-3 py-2 rounded-full bg-card border border-dashed border-line text-xs text-ink-faint hover:text-ink-2 hover:border-line-strong transition-colors cursor-pointer min-h-[44px] focus-ring active:scale-95"
                  aria-label={suggestionChipsExpanded ? "Show fewer suggestions" : `Show ${Math.min(suggestions.length - 2, 2)} more suggestions`}
                >
                  {suggestionChipsExpanded ? `−Show fewer` : `+${Math.min(suggestions.length - 2, 2)} more`}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] text-ink-faint italic">Taking things one step at a time — that's enough.</span>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {suggestions.slice(0, 2).map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => handleSendMessage(chip.text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-line text-xs text-ink-2 hover:bg-fill transition-colors cursor-pointer min-h-[36px] focus-ring active:scale-95"
                  >
                    <chip.Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                    {chip.text}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVoice}
            disabled={loading}
            className={`rounded-2xl transition-all cursor-pointer shrink-0 flex items-center justify-center focus-ring ${
              mode.userState === "anxious" || mode.userState === "low"
                ? "p-4 min-w-[52px] min-h-[52px] bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30 active:scale-95"
                : listening
                ? "p-3 min-w-[44px] min-h-[44px] bg-danger/20 text-danger animate-pulse"
                : loading
                ? "p-3 min-w-[44px] min-h-[44px] bg-fill text-ink-faint opacity-40 cursor-not-allowed"
                : "p-3 min-w-[44px] min-h-[44px] bg-card border border-line text-ink-muted hover:text-ink-2 hover:border-line-strong active:scale-95"
            }`}
            aria-label={listening ? "Stop listening" : "Tap to talk"}
          >
            {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          {/* V2.1: when anxious/low, always show text input alongside voice (voice-first, text always reachable) */}
          {(mode.userState === "anxious" || mode.userState === "low") ? (
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
                placeholder={loading ? "Waiting for Nila…" : "Type or tap the mic…"}
                disabled={loading}
                className="flex-1 bg-card border border-line rounded-2xl px-4 py-3 text-[13px] text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-40 transition-colors"
              />
              <button
                onClick={loading ? handleCancelGeneration : () => handleSendMessage()}
                disabled={!loading && (!inputText.trim() || loading)}
                className={`p-3 rounded-2xl transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring active:scale-95 ${
                  loading
                    ? "bg-danger/20 text-danger hover:bg-danger/30"
                    : inputText.trim()
                    ? "bg-accent/20 text-accent hover:bg-accent/30"
                    : "bg-card border border-line text-ink-faint"
                }`}
                aria-label={loading ? "Stop generating" : "Send"}
              >
                {loading ? <Square className="w-4 h-4" /> : <Send className="w-5 h-5" />}
              </button>
            </>
          ) : showTextInput ? (
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
                className="flex-1 bg-card border border-line rounded-2xl px-4 py-3 text-[13px] text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-40 transition-colors"
              />
              <button
                onClick={loading ? handleCancelGeneration : () => handleSendMessage()}
                disabled={!loading && (!inputText.trim() || loading)}
                className={`p-3 rounded-2xl transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-ring active:scale-95 ${
                  loading
                    ? "bg-danger/20 text-danger hover:bg-danger/30"
                    : inputText.trim()
                    ? "bg-accent/20 text-accent hover:bg-accent/30"
                    : "bg-card border border-line text-ink-faint"
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
              className="flex-1 flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-card border border-dashed border-line text-ink-muted hover:text-ink-2 hover:border-line-strong transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] focus-ring"
              aria-label="Tap to type"
            >
              <Keyboard className="w-5 h-5" />
              <span className="text-sm">{loading ? "Nila is replying…" : "Tap to type"}</span>
            </button>
          )}
        </div>
      </div>

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
      </>
      )}
    </div>
  );
}
