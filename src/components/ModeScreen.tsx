// ModeScreen — the living interface that adapts to time + user state.
// Replaces the static stream with a mode-based UI.

import React, { useState, useEffect } from "react";
import NilaFace from "./NilaFace";
import QuickActions from "./QuickActions";
import {
  getCurrentMode,
  getGreeting,
  getNilaQuestion,
} from "../services/modeEngine";
import { hasCheckinToday, getSkipFlag } from "../services/checkin";
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
import { looksLikeArmRequest, requestArmedCheckin } from "../services/armedCheckin";
import { protocolOfferCard, startProtocolChat, continueProtocolChat, type ProtocolCard } from "../services/protocolChat";
import { speakIfEnabled, speak, listenOnce, stopSpeaking } from "../services/voice";
import CrisisOverlay from "./CrisisOverlay";
import LearnScreen from "./LearnScreen";
import { Settings, LifeBuoy, Mic, Send, MicOff, X } from "lucide-react";

interface ModeScreenProps {
  onOpenSettings?: () => void;
  onOpenCrisis?: () => void;
  onOpenDashboard?: () => void;
}

export default function ModeScreen({ onOpenSettings, onOpenCrisis, onOpenDashboard }: ModeScreenProps) {
  const [mode, setMode] = useState(getCurrentMode());
  const [showCheckin, setShowCheckin] = useState(() => {
    return !mode.hasCheckedIn;
  });
  const [messages, setMessages] = useState<NilaUiMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [auxView, setAuxView] = useState<"learn" | "thought_record" | "values_to_action" | null>(null);
  const [thoughtRecordDraft, setThoughtRecordDraft] = useState<ThoughtRecordDraft | undefined>();
  const [protocolCard, setProtocolCard] = useState<ProtocolCard | null>(() => protocolOfferCard(""));

  // Refresh mode every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setMode(getCurrentMode());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
    try {
      const text = await listenOnce();
      if (text) {
        handleSendMessage(text);
      }
    } catch {
      // Voice failed silently
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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Let's do a quick grounding exercise. Name 5 things you can see." },
        ]);
        break;
      case "breathing":
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Let's breathe together. Breathe in for 4 seconds..." },
        ]);
        break;
      case "diary":
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "How are you feeling right now? Tap the mood that fits." },
        ]);
        break;
      case "medication":
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Did you take your medication today?" },
        ]);
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
      default:
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Opening ${action}...` },
        ]);
    }
  };

  const greeting = getGreeting(mode.timeMode);
  const question = getNilaQuestion(mode.timeMode, mode.userState, mode.hasCheckedIn);

  return (
    <div className="flex flex-col h-full bg-page">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-100">{greeting}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCrisis(true)}
            className="p-2 rounded-full hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            aria-label="Crisis support"
          >
            <LifeBuoy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
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
          {protocolCard && (
            <button
              onClick={handleProtocolTap}
              className="w-full text-left px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/20 transition-colors cursor-pointer"
              id="protocol-card"
            >
              {protocolCard.label}
            </button>
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
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
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
    </div>
  );
}
