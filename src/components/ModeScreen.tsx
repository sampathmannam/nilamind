// ModeScreen — the living interface that adapts to time + user state.
// Replaces the static stream with a mode-based UI.

import React, { useState, useEffect, useMemo, useRef } from "react";
import NilaFace from "./NilaFace";
import QuickActions from "./QuickActions";
import {
  getCurrentMode,
  getGreeting,
  getNilaQuestion,
} from "../services/modeEngine";
import { hasCheckinToday, getSkipFlag } from "../services/checkin";
import { t } from "../services/i18n";
import { useTypingSession } from "../hooks/useTypingSession";
import { getSuggestions, timeSlot } from "../services/chatSuggestions";
import { suggestSkill } from "../services/skillSuggest";
import { filterSkills, type Skill } from "../services/skillsLibrary";
import NilaCheckIn from "./NilaCheckIn";
import ChatLoading from "./ChatLoading";
import SkillOfferCard from "./SkillOfferCard";
import type { CheckInEntry } from "../types";
import { secureLocal } from "../services/secureLocal";
import { sendToNila } from "../services/sendToNila";
import { NilaMode, NilaUiMessage, shouldBlockForCrisisAsync } from "../services/nilaSend";
import { getSessionChat, setSessionChat, clearSessionChat } from "../services/sessionChat";
import { localLlmLoadState } from "../services/localLlm";
import { safeDraftThoughtRecord, type ThoughtRecordDraft } from "../services/thoughtRecordDraft";
import ThoughtRecordScreen from "./ThoughtRecordScreen";
import ValuesToActionScreen from "./ValuesToActionScreen";
import SafetyPlanScreen from "./SafetyPlanScreen";
import { looksLikeArmRequest, requestArmedCheckin } from "../services/armedCheckin";
import { protocolOfferCard, startProtocolChat, continueProtocolChat, type ProtocolCard } from "../services/protocolChat";
import { abandonProtocol } from "../services/protocolProgress";
import { speakIfEnabled, speak, listenOnce, stopSpeaking } from "../services/voice";
import { startVoiceSession, endVoiceSession } from "../services/voicePatterns";
import LearnScreen from "./LearnScreen";
import { parseSafetyPlan } from "../services/safetyPlan";
import { shouldPromptReview, markSafetyPlanReviewed } from "../services/safetyPlanFollowUp";
import { Settings, LifeBuoy, Mic, Send, MicOff, X, ShieldCheck } from "lucide-react";

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
}

// #22 (audit): App wraps <main> in key={activeTab}, so switching tabs fully remounts ModeScreen and its
// useState resets — a half-typed message was lost on any tab round-trip. This module-level cache preserves the
// in-progress draft across remounts (keeps the tab crossfade animation, unlike dropping the key).
let modeDraftCache = "";

export default function ModeScreen({ onOpenSettings, onOpenCrisis, onOpenDashboard, onOpenMedication, onOpenGrounding, onOpenDiary, onOpenReachOut, onOpenWindDown, onInternalSheetChange }: ModeScreenProps) {
  const [mode, setMode] = useState(getCurrentMode());
  const [showCheckin, setShowCheckin] = useState(() => {
    return !mode.hasCheckedIn;
  });
  const [messages, setMessages] = useState<NilaUiMessage[]>([]);
  const [inputText, setInputText] = useState(() => modeDraftCache); // #22: restore draft after a tab-switch remount
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [auxView, setAuxView] = useState<"learn" | "thought_record" | "values_to_action" | "safety_plan" | null>(null);
  const [thoughtRecordDraft, setThoughtRecordDraft] = useState<ThoughtRecordDraft | undefined>();
  const [protocolCard, setProtocolCard] = useState<ProtocolCard | null>(() => protocolOfferCard(""));
  const [showSafetyPlanReview, setShowSafetyPlanReview] = useState(false);
  const [skillOffer, setSkillOffer] = useState<Skill | null>(null);
  // #4 + #9 (audit): §9 crisis now routes through the App-level overlay (onOpenCrisis) so the Android hardware
  // back button closes it instead of exiting the app; a session that ever tripped §9 latches hadCrisisRef so
  // the transcript is never persisted/restored (keying the clear on a transient boolean re-persisted it on dismiss).
  const hadCrisisRef = useRef(false);
  const openCrisis = () => {
    hadCrisisRef.current = true;
    clearSessionChat(); // scrub anything already written this session
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

  // B3: surface a gentle safety-plan follow-up card when the plan is stale.
  // Re-check when an aux sheet closes so editing the plan immediately clears the card.
  useEffect(() => {
    try {
      const raw = secureLocal.getItem("nilamind_safetyplan");
      const plan = parseSafetyPlan(raw);
      setShowSafetyPlanReview(shouldPromptReview(plan));
    } catch {
      setShowSafetyPlanReview(false);
    }
  }, [auxView]);

  // audit 2.1 — CHAT PERSISTENCE (regressed in the rewrite: sessionChat was imported but never used).
  // Restore an in-progress conversation on mount so it survives leaving/killing the app; a crisis session
  // is intentionally never restored (it is cleared by the persist effect below).
  useEffect(() => {
    const saved = getSessionChat();
    if (saved.length) setMessages(saved);
  }, []);

  // Persist the chat as it grows. INVARIANT: a §9 crisis turn is NEVER persisted — clear the store so a
  // crisis transcript can't be restored later (mirrors the old AiCoachScreen rule). asyncReflection and
  // armedCheckin read getSessionChat(), so this is also what makes those features see real conversations.
  useEffect(() => {
    // #4 (audit): once a session has EVER tripped §9, never persist it. The old code keyed the clear on the
    // transient showCrisis boolean, so the crisis transcript was re-written the instant the overlay closed.
    if (hadCrisisRef.current) { clearSessionChat(); return; }
    if (messages.length) setSessionChat(messages);
  }, [messages]);

  const handleCheckinLogged = (entry: CheckInEntry) => {
    setShowCheckin(false);
    setMode(getCurrentMode());
    setMessages((prev) => [
      ...prev,
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
    const userMsg: NilaUiMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMsg]);

    // Armed check-in is a deterministic, opt-in command — handle it before the model.
    if (looksLikeArmRequest(msg)) {
      // #3 (audit): the arm path gates with keyword-only scanForCrisis, so a euphemistic crisis that also
      // matches the arm-request regex ("check on me… the world would feel lighter without me") would get a
      // cheerful check-in confirmation. Run the full classifier-backed §9 gate here first.
      if (await shouldBlockForCrisisAsync(msg)) { openCrisis(); return; }
      const armResult = requestArmedCheckin(msg, [...messages, userMsg]);
      if (armResult.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Got it — I'll check in with you ${armResult.triggerLabel}.` },
        ]);
      } else if (armResult.reason === "crisis") {
        openCrisis();
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
        // §9 crisis: a text bubble with non-tappable helplines is not enough. Open the REAL crisis card
        // (tappable crisis lines + safety-plan button) — the deterministic §9 surface the reply text
        // promises. Covers both the typed path and the voice path (handleVoice → handleSendMessage).
        openCrisis();
      }
      if (result.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
        if (result.reachedAI) {
          speakIfEnabled(result.reply);
        }
      }
      // After Nila replies, refresh the protocol card (continue if active, else re-offer).
      setProtocolCard(protocolOfferCard(msg));
      // Suggest a relevant coping skill if the user expressed distress
      const suggestion = suggestSkill(msg);
      setSkillOffer(suggestion?.skill ?? null);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having a quiet moment — my model isn't responding right now. Your phone might be low on memory or the model needs a moment. Try typing again? 💙" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoice = async () => {
    if (listening) {
      setListening(false);
      stopSpeaking();
      return;
    }

    setListening(true);
    const vsId = startVoiceSession("chat");
    try {
      const text = await listenOnce();
      endVoiceSession(vsId, text);
      if (text) {
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
        openCrisis();
        return;
      }
      // empty → open blank
    } else {
      setThoughtRecordDraft(result.draft);
    }
    setAuxView("thought_record");
  };

  const handleOpenSafetyPlan = () => {
    setAuxView("safety_plan");
  };

  const handleMarkSafetyPlanReviewed = () => {
    markSafetyPlanReviewed();
    setShowSafetyPlanReview(false);
  };

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
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: `**${skill.name}** — ${skill.purpose}\n\n${steps}\n\nTake your time with this. Even a small try counts. 💙` },
    ]);
    setSkillOffer(null);
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
      case "self_compassion": {
        const result = startProtocolChat("self-compassion");
        if (result.kind === "started") {
          setMessages((prev) => [...prev, { role: "assistant", content: result.prompt }]);
          setProtocolCard(protocolOfferCard(""));
        }
        break;
      }
      case "values_to_action":
        setAuxView("values_to_action");
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

  return (
    <div className="flex flex-col h-full bg-page">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{greeting}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t("settings")}
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => openCrisis()}
            className="p-2 rounded-full hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            aria-label={t("crisisButton")}
          >
            <LifeBuoy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content — scrollable for chat messages */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-start p-4 space-y-6 pt-8">
        {/* Check-in gate */}
        {showCheckin && (
          <div className="w-full max-w-sm">
            <NilaCheckIn onLogged={handleCheckinLogged} onSkip={handleCheckinSkip} />
          </div>
        )}

        {/* Nila's face + question */}
        {!showCheckin && (
          <>
            <NilaFace
              state={mode.userState}
              onClick={handleVoice}
              onLongPress={() => openCrisis()}
              size={140}
            />

            <div className="text-center space-y-2">
              <p className="text-lg text-slate-200 font-display">{question}</p>
              {mode.userState && mode.userState !== "calm" && (
                <p className="text-xs text-slate-400">
                  {mode.userState === "anxious" && "I'm here with you. Take your time."}
                  {mode.userState === "low" && "You're not alone in this."}
                  {mode.userState === "elevated" && "Let's slow things down together."}
                </p>
              )}
            </div>

            {/* Quick actions */}
            <QuickActions onAction={handleQuickAction} timeMode={mode.timeMode} />

            {/* Messages — #23 (audit): render the FULL conversation (was slice(-5), so earlier turns became
                unreachable) and auto-scroll to the newest reply via bottomRef below. */}
            {messages.length > 0 && (
              <div className="w-full max-w-sm space-y-3 mt-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm text-white ${
                        m.role === "user"
                          ? ""
                          : "bg-slate-800 text-slate-200"
                      }`}
                      style={m.role === "user" ? { backgroundColor: "#6b21a8" } : undefined}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Chat loading — skeleton shimmer + typing dots */}
            {loading && <ChatLoading />}

            {/* #23 (audit): scroll anchor so a new reply is always brought into view. */}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      {!showCheckin && (
        <div className="px-4 py-3 border-t border-slate-800/50 space-y-2">
          {showSafetyPlanReview && (
            <div
              className="w-full px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs"
              id="safety-plan-review-card"
            >
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Your safety plan could use a quick look</p>
                  <p className="text-amber-200/70 mt-0.5">No pressure — a fast review helps keep it useful.</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleOpenSafetyPlan}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors cursor-pointer"
                    >
                      Review plan
                    </button>
                    <button
                      onClick={handleMarkSafetyPlanReviewed}
                      className="px-2.5 py-1 rounded-lg hover:bg-amber-500/15 text-amber-200/80 transition-colors cursor-pointer"
                    >
                      Looks good
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {protocolCard && (
            <button
              onClick={handleProtocolTap}
              className="w-full text-left px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors cursor-pointer"
              id="protocol-card"
            >
              {protocolCard.label}
            </button>
           )}

          {/* Skill suggestion card — appears when Nila detects distress */}
          {skillOffer && (
            <SkillOfferCard
              skill={skillOffer}
              reason={suggestSkill(messages.filter(m => m.role === "user").pop()?.content || "")?.reason || "This might help"}
              emoji={suggestSkill(messages.filter(m => m.role === "user").pop()?.content || "")?.emoji || "💡"}
              onTry={handleTrySkill}
              onDismiss={() => setSkillOffer(null)}
            />
          )}

          {/* Quick suggestion chips — tap to send */}
          {messages.length <= 1 && !inputText && (
            <div className="flex flex-wrap gap-2" id="chat-suggestions">
              {suggestions.map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => handleSendMessage(chip.text)}
                  className="px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors cursor-pointer"
                >
                  {chip.emoji} {chip.text}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleVoice}
              className={`p-3 rounded-full transition-colors cursor-pointer ${
                listening
                  ? "bg-rose-500/20 text-rose-400 animate-pulse"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              aria-label={listening ? "Stop listening" : "Tap to talk"}
            >
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <input
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
              className={`p-3 rounded-xl transition-colors cursor-pointer ${
                inputText.trim() && !loading
                  ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  : "bg-slate-800 text-slate-500"
              }`}
              aria-label="Send"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* #9 (audit): the §9 crisis overlay is now rendered once at the App level (back-button aware) and
          opened via onOpenCrisis() / openCrisis() above — no duplicate local overlay that the hardware back
          button couldn't see (which previously exited the app during a crisis). */}

      {/* Aux view sheets */}
      {auxView === "learn" && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="learn-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">Learn</span>
            <button
              onClick={() => setAuxView(null)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <LearnScreen />
          </div>
        </div>
      )}

      {auxView === "thought_record" && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="thought-record-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">Thought Record</span>
            <button
              onClick={() => { setAuxView(null); setThoughtRecordDraft(undefined); }}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <ThoughtRecordScreen draft={thoughtRecordDraft} />
          </div>
        </div>
      )}

      {auxView === "values_to_action" && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="values-to-action-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">Do one thing</span>
            <button
              onClick={() => setAuxView(null)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <ValuesToActionScreen />
          </div>
        </div>
      )}

      {auxView === "safety_plan" && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col animate-slide-in" id="safety-plan-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <span className="text-sm font-semibold text-slate-100">My Safety Plan</span>
            <button
              onClick={() => setAuxView(null)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <SafetyPlanScreen />
          </div>
        </div>
      )}
    </div>
  );
}
