// ModeScreen — the living interface that adapts to time + user state.
// Replaces the static stream with a mode-based UI.

import React, { useState, useEffect, useMemo } from "react";
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
import NilaCheckIn from "./NilaCheckIn";
import type { CheckInEntry } from "../types";
import { secureLocal } from "../services/secureLocal";
import { sendToNila } from "../services/sendToNila";
import { NilaMode, NilaUiMessage } from "../services/nilaSend";
import { getSessionChat, setSessionChat, clearSessionChat } from "../services/sessionChat";
import { localLlmLoadState } from "../services/localLlm";
import { safeDraftThoughtRecord, type ThoughtRecordDraft } from "../services/thoughtRecordDraft";
import ThoughtRecordScreen from "./ThoughtRecordScreen";
import ValuesToActionScreen from "./ValuesToActionScreen";
import SafetyPlanScreen from "./SafetyPlanScreen";
import { looksLikeArmRequest, requestArmedCheckin } from "../services/armedCheckin";
import { protocolOfferCard, startProtocolChat, continueProtocolChat, type ProtocolCard } from "../services/protocolChat";
import { speakIfEnabled, speak, listenOnce, stopSpeaking } from "../services/voice";
import { startVoiceSession, endVoiceSession } from "../services/voicePatterns";
import CrisisOverlay from "./CrisisOverlay";
import LearnScreen from "./LearnScreen";
import { parseSafetyPlan } from "../services/safetyPlan";
import { shouldPromptReview, markSafetyPlanReviewed } from "../services/safetyPlanFollowUp";
import { Settings, LifeBuoy, Mic, Send, MicOff, X, ShieldCheck } from "lucide-react";

interface ModeScreenProps {
  onOpenSettings?: () => void;
  onOpenCrisis?: () => void;
  onOpenDashboard?: () => void;
  onOpenMedication?: () => void;
  onOpenGrounding?: () => void;
}

export default function ModeScreen({ onOpenSettings, onOpenCrisis, onOpenDashboard, onOpenMedication, onOpenGrounding }: ModeScreenProps) {
  const [mode, setMode] = useState(getCurrentMode());
  const [showCheckin, setShowCheckin] = useState(() => {
    return !mode.hasCheckedIn;
  });
  const [messages, setMessages] = useState<NilaUiMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [auxView, setAuxView] = useState<"learn" | "thought_record" | "values_to_action" | "safety_plan" | null>(null);
  const [thoughtRecordDraft, setThoughtRecordDraft] = useState<ThoughtRecordDraft | undefined>();
  const [protocolCard, setProtocolCard] = useState<ProtocolCard | null>(() => protocolOfferCard(""));
  const [showSafetyPlanReview, setShowSafetyPlanReview] = useState(false);

  // Refresh mode every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setMode(getCurrentMode());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
      const armResult = requestArmedCheckin(msg, [...messages, userMsg]);
      if (armResult.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Got it — I'll check in with you ${armResult.triggerLabel}.` },
        ]);
      } else if (armResult.reason === "crisis") {
        setShowCrisis(true);
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
      if (result.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
        if (result.reachedAI) {
          speakIfEnabled(result.reply);
        }
      }
      // After Nila replies, refresh the protocol card (continue if active, else re-offer).
      setProtocolCard(protocolOfferCard(msg));
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble responding right now. Try again in a moment." },
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
        setShowCrisis(true);
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
      }
    } else {
      const result = startProtocolChat(protocolCard.protocolId);
      if (result.kind === "started") {
        setMessages((prev) => [...prev, { role: "assistant", content: result.prompt }]);
        setProtocolCard(protocolOfferCard(""));
      }
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "grounding":
        onOpenGrounding?.();
        break;
      case "breathing":
        onOpenGrounding?.();
        break;
      case "diary":
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "How are you feeling right now? Tap the mood that fits." },
        ]);
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
        setShowCrisis(true);
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Who could you reach out to today — even just a small message? Sometimes the smallest reach is the strongest one." },
        ]);
        break;
      case "wind_down":
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Let's wind down. Take a slow breath. Want to try a quick grounding exercise or talk through what's on your mind?" },
        ]);
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
            onClick={() => setShowCrisis(true)}
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
              onLongPress={() => setShowCrisis(true)}
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

            {/* Messages */}
            {messages.length > 0 && (
              <div className="w-full max-w-sm space-y-3 mt-4">
                {messages.slice(-5).map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.role === "user"
                          ? "bg-purple-600 text-white"
                          : "bg-slate-800 text-slate-200"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Crisis overlay */}
      {showCrisis && (
        <CrisisOverlay
          isOpen={showCrisis}
          onClose={() => setShowCrisis(false)}
          onNavigateToGrounding={() => {
            setShowCrisis(false);
            handleQuickAction("grounding");
          }}
          onNavigateToBreathing={() => {
            setShowCrisis(false);
            handleQuickAction("breathing");
          }}
        />
      )}

      {/* Aux view sheets */}
      {auxView === "learn" && (
        <div className="fixed inset-0 z-50 bg-page" id="learn-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">Learn</span>
            <button
              onClick={() => setAuxView(null)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            <LearnScreen />
          </div>
        </div>
      )}

      {auxView === "thought_record" && (
        <div className="fixed inset-0 z-50 bg-page" id="thought-record-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">Thought Record</span>
            <button
              onClick={() => { setAuxView(null); setThoughtRecordDraft(undefined); }}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            <ThoughtRecordScreen draft={thoughtRecordDraft} />
          </div>
        </div>
      )}

      {auxView === "values_to_action" && (
        <div className="fixed inset-0 z-50 bg-page" id="values-to-action-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">Do one thing</span>
            <button
              onClick={() => setAuxView(null)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            <ValuesToActionScreen />
          </div>
        </div>
      )}

      {auxView === "safety_plan" && (
        <div className="fixed inset-0 z-50 bg-page" id="safety-plan-sheet">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <span className="text-sm font-semibold text-slate-100">My Safety Plan</span>
            <button
              onClick={() => setAuxView(null)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-y-auto p-4">
            <SafetyPlanScreen />
          </div>
        </div>
      )}
    </div>
  );
}
