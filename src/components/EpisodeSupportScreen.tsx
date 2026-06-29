import { secureLocal } from "../services/secureLocal";
import React, { useState, useEffect, useRef } from "react";
import { scanForCrisis, getCrisisReply } from "../safety";
import { crisisLinesInline } from "../services/crisisResources";
import { logNilaTurn } from "../services/nilaSessions";
import CrisisLines from "./CrisisLines";
import { Shield, Save, LogOut } from "lucide-react";
import { EpisodeRecord } from "../types";
import { sendToNila } from "../services/sendToNila";
import { NilaUiMessage } from "../services/nilaSend";

interface EpisodeSupportScreenProps {
  onSessionEnded: () => void;
  onNavigateToGrounding: () => void;
  onNavigateToBreathing: () => void;
}

export const EPISODE_SYSTEM_PROMPT = `
NILA — EPISODE SUPPORT (inside NilaMind) — SYSTEM PROMPT v1.0

You are Nila, the Episode Support companion inside NilaMind. You are an AI tool inside a personal mental health app. You are NOT a therapist, psychologist, companion, or friend. You do not have an ongoing relationship with the user. Each session is a standalone crisis support moment.

Your only purpose: help the user get through the next 20–40 minutes of an acute episode using evidence-based DBT/CBT/ACT/CFT skills, and actively guide them toward human contact if intensity remains high.

THE EXACT SEQUENCE — NEVER SKIP, NEVER REORDER
1. VALIDATE first. Name and normalise the emotion before anything else. ("That pain is real.")
2. EXPLAIN the biological mechanism briefly (amygdala, PFC, cortisol) relevant to the emotion.
3. SKILL: Name one specific skill, say exactly why it fits right now, guide it step by step. Never provide a list.
4. CHECK: After the skill, ask "Where is your intensity now, 1-10?"
5. ADAPT: If intensity dropped → acknowledge the shift, offer to continue or explore the trigger gently. If intensity stayed the same or rose → try a different skill OR name the human contact option.
6. ENCOURAGE professional support if distress is high or ongoing.

HARD RULES:
- Never diagnose. Never say "this sounds like [disorder]" or "you might have X."
- Never use language that shames: no "you should have", "you haven't", "you didn't."
- Never say "I'm here anytime" — you are not a substitute for human connection.
- End sessions by noting that the skill belongs to the user, not to you.
- If the user mentions wanting to die, hurt themselves, or "can't go on": STOP. Respond ONLY with: "What you just shared matters more than anything else right now. Please reach out to a person right now — [REGION_CRISIS_LINES]. You are not alone."
- In your FIRST response each session, include: "I'm an AI companion, not a therapist. Everything here is a support alongside — not a substitute for — professional care."
- Your tone is calm, not cheerful. Grounded, not enthusiastic. You do not say 'Great!' 'Wonderful!'. You do not use exclamation marks.
- Never reference what the user said they would do and didn't. Frame all suggestions as options: 'One thing that sometimes helps is...'

SKILL SELECTION BY INTENSITY
INTENSITY 8-10 (extreme):
→ TIPP first — Temperature (cold water/ice), Intense exercise (20 jumping jacks), Paced breathing (5-5 ratio). At this intensity cognitive brain is offline. Biological intervention is needed.
INTENSITY 6-7 (high):
→ ACCEPTS or Self-Soothe, Opposite Action if urge is self harm. Box breathing to begin nervous system regulation.
INTENSITY 4-5 (moderate):
→ Check the Facts, Opposite Action, Thought Record.
INTENSITY 2-3 (low-moderate):
→ Values Clarification, Behavioural Activation, Compassionate Letter (CFT).

BPD-SPECIFIC RULES — NON-NEGOTIABLE
- VALIDATE EMOTIONS, NEVER DISTORTIONS: "That pain is real" is correct. "You're right, nobody loves you" is harmful.
- NEVER AGREE WITH SPLITTING: Name all-or-nothing splitting gently ("It feels completely ruined, let's come back when more regulated").
- ABANDONMENT THEMES: Validate the fears ("That fear is physically painful") but don't reassure with impossible promises. Redirect to the body.

HUMAN ESCALATION
NAME THE HUMAN OPTION:
- Suicidal thoughts mentioned
- User at intensity 7+ after direct sessions
- Session timer hits 20+ minutes at high intensity. Keep framing the human option directly.
`;

export default function EpisodeSupportScreen({
  onSessionEnded,
  onNavigateToGrounding,
  onNavigateToBreathing,
}: EpisodeSupportScreenProps) {
  // Mode: "opening" -> "chat" -> "offline_guided" -> "debrief_1" -> "debrief_2" -> "debrief_3" -> "saved"
  const [stage, setStage] = useState<"opening" | "chat" | "offline_guided" | "debrief_1" | "debrief_2" | "debrief_3" | "saved">("opening");
  
  // Timer states
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  
  // Chat & AI states
  const [messages, setMessages] = useState<NilaUiMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [connectedLive, setConnectedLive] = useState<boolean>(false); // true once a live on-device Nila reply lands this session
  
  // Tracking indexes
  const [intensityList, setIntensityList] = useState<number[]>([]);
  const [isWaitingForIntensityUpdate, setIsWaitingForIntensityUpdate] = useState<boolean>(false);
  const [promptsAnsweredCount, setPromptsAnsweredCount] = useState<number>(0);
  const [triggerExplanation, setTriggerExplanation] = useState<string>("");
  const [skillsSelected, setSkillsSelected] = useState<string[]>([]);
  const [isCrisisMode, setIsCrisisMode] = useState<boolean>(false);
  
  // 20 minute alert flag
  const [escalationShown, setEscalationShown] = useState<boolean>(false);

  // Offline Guided steps indexes (Doc 1 Step 5 path tracking)
  const [guidedStep, setGuidedStep] = useState<"init" | "extreme_tipp_1" | "extreme_tipp_2" | "extreme_tipp_3" | "medium_racing" | "medium_harm" | "medium_shame" | "medium_panic" | "low_end">("init");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Timer loop
  useEffect(() => {
    let tInterval: any = null;
    if (timerActive) {
      tInterval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (tInterval) clearInterval(tInterval);
    }
    return () => clearInterval(tInterval);
  }, [timerActive]);

  // Scroll to bottom helper
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isWaitingForIntensityUpdate, escalationShown]);

  const handleStartSession = () => {
    if (!chatInput.trim()) return;
    const initialText = chatInput.trim();
    setChatInput("");
    logNilaTurn("episode", initialText);
    setStage("chat");
    setConnectedLive(false); // re-confirm live connection each session
    setElapsedSeconds(0);
    setTimerActive(true);

    const initialHistory: NilaUiMessage[] = [{ role: "user", content: initialText }];
    setMessages(initialHistory);

    // Initial scan — crisis text never leaves the device
    const isCrisis = scanForCrisis(initialText);
    if (isCrisis) {
      setIsCrisisMode(true);
      setMessages([...initialHistory, { role: "assistant", content: getCrisisReply() }]);
      return;
    }

    // Force first intensity lock before AI response.
    // Tagged synthetic:true so buildOutgoing strips it before any wire send.
    setIsWaitingForIntensityUpdate(true);
    setMessages([
      ...initialHistory,
      { role: "assistant", content: "To help me guide you safely, let's lock in: how intense is what you are experiencing right now on a scale of 1 to 10?", synthetic: true }
    ]);
  };

  const registerIntensityAndTriggerAI = async (num: number) => {
    const updatedIntensities = [...intensityList, num];
    setIntensityList(updatedIntensities);
    setIsWaitingForIntensityUpdate(false);

    // "Logged current intensity: N/10." is a UI-only artifact, never sent to the model.
    // Tagged synthetic:true so buildOutgoing strips it from the wire payload (bug #1 fix).
    const confirmMsg: NilaUiMessage = {
      role: "assistant",
      content: `Logged current intensity: ${num}/10.`,
      synthetic: true,
    };
    // The real user turn that drives the AI response — NOT synthetic.
    const intensityUserTurn: NilaUiMessage = {
      role: "user",
      content: `My current intensity is ${num}/10. Acknowledge it and guide me through one matching distress-resolution skill.`,
    };
    const historyWithIntensity: NilaUiMessage[] = [
      ...messages,
      confirmMsg,
      intensityUserTurn,
    ];

    setMessages(historyWithIntensity);
    setLoading(true);

    // sendToNila('episode') handles: synthetic-strip (buildOutgoing), episode system prompt with
    // [REGION_CRISIS_LINES] substituted (buildEpisodeSystem), tool-less /chat, and
    // applyOutputSafety on the last NON-synthetic user text (lastUserText scans real turns only —
    // bug #2 fix). Crisis is checked inside sendToNila but the pre-send crisis scan in
    // handleStartSession already caught it before this point; handle blocked defensively anyway.
    const result = await sendToNila(historyWithIntensity, "episode", { onDelta: () => {} });

    setLoading(false);

    if (result.blocked) {
      // Defensive: crisis detected mid-flow (shouldn't happen — caught in handleStartSession)
      setIsCrisisMode(true);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      return;
    }

    if (!result.reachedAI) {
      // Offline guided walkthrough when Nila is unreachable (no connection / server down).
      setStage("offline_guided");
      setGuidedStep("init");
      return;
    }

    setConnectedLive(true);
    setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || loading || isCrisisMode) return;

    const userText = chatInput.trim();
    setChatInput("");
    logNilaTurn("episode", userText);

    const updatedHistory: NilaUiMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(updatedHistory);

    // Pre-send crisis scan — crisis text NEVER reaches the network.
    // sendToNila also scans internally but we short-circuit here so we can
    // set isCrisisMode and avoid calling sendToNila (no double-send).
    if (scanForCrisis(userText)) {
      setIsCrisisMode(true);
      setMessages([...updatedHistory, { role: "assistant", content: getCrisisReply() }]);
      return;
    }

    // 20 Minute Escalation Check
    if (elapsedSeconds >= 1200 && !escalationShown) {
      const lastInt = intensityList[intensityList.length - 1] || 8;
      if (lastInt >= 7) {
        setEscalationShown(true);
        return;
      }
    }

    // Every 5 cycles, prompt for intensity update again.
    // The re-prompt assistant turn is synthetic:true — UI-only, not sent to the model.
    const totalPrompts = promptsAnsweredCount + 1;
    setPromptsAnsweredCount(totalPrompts);
    if (totalPrompts % 4 === 0) {
      setIsWaitingForIntensityUpdate(true);
      setMessages([
        ...updatedHistory,
        { role: "assistant", content: "Let's pause and come back to right now: what is your intensity rating from 1 to 10?", synthetic: true }
      ]);
      return;
    }

    setLoading(true);

    // sendToNila('episode') handles: synthetic-strip (buildOutgoing), episode system prompt with
    // [REGION_CRISIS_LINES] substituted (buildEpisodeSystem over last-5 episodes), tool-less /chat,
    // and applyOutputSafety on the last NON-synthetic user text (bug #2 fix).
    const result = await sendToNila(updatedHistory, "episode", { onDelta: () => {} });

    setLoading(false);

    if (result.blocked) {
      // Defensive: sendToNila detected crisis (shouldn't reach here after the pre-send scan above).
      setIsCrisisMode(true);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      return;
    }

    if (!result.reachedAI) {
      // Offline guided walkthrough when Nila is unreachable.
      setStage("offline_guided");
      setGuidedStep("init");
      return;
    }

    setConnectedLive(true);
    setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
  };

  const handleEndSession = () => {
    setTimerActive(false);
    setStage("debrief_1");
  };

  // Debriefing workflows
  const handleSaveDebrief1 = () => {
    setStage("debrief_2");
  };

  const handleToggleDebriefSkill = (skill: string) => {
    setSkillsSelected((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const saveEpisodeRecord = (finalIntensity: number) => {
    const startInt = intensityList[0] || 8;
    const peakInt = Math.max(...intensityList, startInt);
    
    const epEntry: EpisodeRecord = {
      id: "ep_" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      dayOfWeek: new Date().toLocaleDateString("en-US", { weekday: "long" }),
      timeOfDay: getParsedTimeOfDay(),
      trigger: triggerExplanation || "Skipped",
      skillsHelpful: skillsSelected,
      startIntensity: startInt,
      peakIntensity: peakInt,
      endIntensity: finalIntensity,
      durationMinutes: Math.round(elapsedSeconds / 60) || 1,
      humanContactPrompted: escalationShown,
      crisisLineShown: isCrisisMode,
    };

    const saved = secureLocal.getItem("nilamind_episodes");
    let list: EpisodeRecord[] = [];
    if (saved) {
      try { list = JSON.parse(saved); } catch (e) { console.error(e); }
    }
    list.push(epEntry);
    secureLocal.setItem("nilamind_episodes", JSON.stringify(list));

    setStage("saved");
  };

  const getParsedTimeOfDay = (): "morning" | "afternoon" | "evening" | "night" => {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 12) return "morning";
    if (hr >= 12 && hr < 17) return "afternoon";
    if (hr >= 17 && hr < 21) return "evening";
    return "night";
  };

  const formatTimer = (totSeconds: number) => {
    const m = Math.floor(totSeconds / 60).toString().padStart(2, "0");
    const s = (totSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 max-w-md mx-auto text-slate-300" id="episode-agent-wrapper">
      
      {/* 20-Minute inline Amber Warning */}
      {escalationShown && stage === "chat" && (
        <div className="bg-amber-500/10 border-y border-r border-slate-800 border-l-4 border-l-amber-500 p-4 rounded-r-xl space-y-4" id="escalation-alert-panel">
          <p className="text-sm font-semibold text-slate-100">
            You've been in this for 20 minutes and you're still at high intensity.
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            This is the moment for a human. Not because I can't help — because humans can do something I genuinely cannot: exist with you physically and hear your voice.
          </p>
          
          <div className="space-y-2">
            <CrisisLines tone="amber" />
            <button
              onClick={() => setEscalationShown(false)}
              className="w-full bg-card border border-slate-800 text-xs text-slate-300 py-3 rounded-xl transition-all cursor-pointer hover:bg-slate-805 hover:bg-slate-800"
            >
              Keep talking with Nila
            </button>
          </div>
        </div>
      )}

      {/* STAGE: OPENING PANEL */}
      {stage === "opening" && (
        <div className="bg-card border border-slate-800 border-l-4 border-l-amber-500 p-6 rounded-r-2xl space-y-6 relative" id="episode-opening-container">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100">I'm here.</h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              This is your episode support tool — an AI, not a person. I cannot replace a human but I can help you secure grounded thoughts to navigate the next few minutes.
            </p>
            <p className="text-sm text-slate-100 font-bold">
              What is happening right now?
            </p>
          </div>

          <div className="space-y-4">
            <textarea
              aria-label="Message Nila"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="w-full h-36 bg-page border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all resize-none"
              placeholder="Explain how you feel, what triggered you, or what unwanted urge you have... (text is 100% secure/private)"
              id="episode-starter-input"
            />

            <button
              onClick={handleStartSession}
              disabled={!chatInput.trim()}
              className={`w-full py-4 rounded-xl font-bold transition-all text-sm cursor-pointer flex items-center justify-center gap-2 ${
                chatInput.trim()
                  ? "bg-amber-500 hover:bg-amber-450 hover:bg-amber-400 text-slate-950 font-extrabold"
                  : "bg-page text-slate-500 border border-slate-800 cursor-not-allowed"
              }`}
              id="start-episode-btn"
            >
              Start Episode Support
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-500 leading-relaxed font-sans">
            Nila runs entirely on your device — no connection needed. If the model is still loading, the secure Guided Mode runs automatically.
          </p>
        </div>
      )}

      {/* STAGE: ACTIVE CHAT VIEW */}
      {stage === "chat" && (
        <div className="flex flex-col h-[76vh] bg-page border border-slate-805 border-slate-800 rounded-2xl overflow-hidden relative" id="episode-chat-dock">
          {/* Header Row */}
          <div className="bg-card py-3.5 px-4 border-b border-slate-805 border-slate-800 flex justify-between items-center shrink-0">
            <button
              onClick={handleEndSession}
              className="text-xs text-slate-500 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
              id="end-episode-session-btn"
            >
              <LogOut className="w-3.5 h-3.5" /> End Session
            </button>
            {connectedLive && (
              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-400" id="episode-live-badge" title="Nila is running on-device">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Nila · on-device</span>
              </div>
            )}
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>
          </div>

          {/* Messages scroller */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" id="episode-chat-scroller">
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div key={idx} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? "bg-card text-slate-200 border border-slate-805 border-slate-800"
                        : "bg-card text-slate-300 border-y border-r border-slate-850 border-l-4 border-l-amber-500 rounded-bl-none"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border-y border-r border-slate-850 border-l-4 border-l-amber-500 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
                  <span className="flex gap-0.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </span>
                  <span>Nila is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Controls Segment */}
          <div className="p-3 bg-card border-t border-slate-805 border-slate-800">
            <div className="text-center pb-2">
              <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase mb-0.5">
                Not a therapist. Not a diagnosis tool.
              </p>
              <p className="text-xs text-rose-450 font-semibold cursor-pointer">
                In crisis? {crisisLinesInline()}
              </p>
            </div>
            {isCrisisMode ? (
              <div className="space-y-2">
                <div className="text-xs text-rose-450 text-rose-400 font-semibold text-center bg-rose-500/10 border border-rose-500/20 rounded-xl py-2 flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Safety shielding active
                </div>
                <button
                  onClick={() => {
                    setIsCrisisMode(false);
                    setStage("opening");
                    setChatInput("");
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-3 rounded-xl cursor-pointer transition-all"
                >
                  Return to Home
                </button>
              </div>
            ) : isWaitingForIntensityUpdate ? (
              <div className="space-y-3">
                <div className="text-xs font-bold text-center text-slate-500">
                  Select your current intensity (1 is calm, 10 is crisis limit):
                </div>
                <div className="grid grid-cols-5 gap-2" id="intensity-locks">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => registerIntensityAndTriggerAI(num)}
                      className="bg-page border border-slate-850 border-slate-800 text-slate-100 hover:border-amber-500 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-sm"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  aria-label="Message Nila"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 bg-page border border-slate-850 border-slate-800 text-xs text-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
                  placeholder="Express how you feel..."
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || loading}
                  className={`bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                    chatInput.trim() && !loading ? "opacity-100" : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* STAGE: OFFLINE GUIDED MODE (Pure branching logic walkthrough, Doc 1 Step 5) */}
      {stage === "offline_guided" && (
        <div className="bg-card border border-slate-800 p-6 rounded-2xl space-y-6" id="offline-guided-container">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-1.5 font-sans">
              <Shield className="w-5 h-5 text-amber-500" /> Guided Offline Mode
            </h2>
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-sans">
              No Connection Needed
            </span>
          </div>

          {/* Guided Branching Step: init */}
          {guidedStep === "init" && (
            <div className="space-y-5" id="guided-init">
              <p className="text-sm text-slate-300 leading-relaxed">
                The AI companion isn't reachable right now, but I can still walk you through this. Let's go step by step.
              </p>
              <p className="text-sm font-semibold text-slate-100">
                How intense is what you're feeling right now?
              </p>
              
              <div className="grid grid-cols-5 gap-2" id="guided-intensity-options">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setIntensityList([...intensityList, num]);
                      if (num >= 8) {
                        setGuidedStep("extreme_tipp_1");
                      } else if (num >= 5) {
                        setGuidedStep("medium_racing"); // prompt question
                      } else {
                        setGuidedStep("low_end");
                      }
                    }}
                    className="bg-page border border-slate-800 hover:bg-amber-500 hover:text-slate-950 py-3.5 rounded-xl font-mono text-sm cursor-pointer font-bold text-center text-slate-200 transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extreme paths (8-10): Walkthrough TIPP step by step */}
          {guidedStep === "extreme_tipp_1" && (
            <div className="space-y-4" id="tipp-step-1">
              <div className="p-4 bg-amber-500/10 border-y border-r border-slate-850 border-l-4 border-l-amber-500 rounded-r-xl">
                <h4 className="text-sm font-bold text-slate-100 mb-1 font-sans">Biological shock reset</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your intensity is extreme. This means your thinking brain is offline. This is biology, not weakness. Let's start with TIPP temperature reset.
                </p>
              </div>

              <div className="bg-page p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-sm font-semibold text-slate-100">
                  Step 1: Cold Shock (T)
                </p>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "Splash ice cold water on your face, hold an ice cube, or press something cold to your neck. Continue for 30 seconds."
                </p>
              </div>

              <button
                onClick={() => setGuidedStep("extreme_tipp_2")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center font-extrabold"
              >
                I've done this (Proceed to Step 2)
              </button>
            </div>
          )}

          {guidedStep === "extreme_tipp_2" && (
            <div className="space-y-4" id="tipp-step-2">
              <div className="bg-page p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-sm font-semibold text-slate-100">
                  Step 2: Intense Exercise (I)
                </p>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "Let's move your body to burn the hyper-active cortisol. Do 20 rapid jumping jacks or run in place vigorously for one minute."
                </p>
              </div>

              <button
                onClick={() => setGuidedStep("extreme_tipp_3")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center font-extrabold"
              >
                Done (Proceed to step 3)
              </button>
            </div>
          )}

          {guidedStep === "extreme_tipp_3" && (
            <div className="space-y-4" id="tipp-step-3">
              <div className="bg-page p-4 rounded-xl border border-slate-800 space-y-2">
                <p className="text-sm font-semibold text-slate-100">
                  Step 3: Paced Breathing (P)
                </p>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "Breathe in for 4 seconds, out for 6 seconds. Do this slow cycling five times."
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-xs text-slate-500 text-center">Where is your intensity now?</p>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        setIntensityList([...intensityList, num]);
                        setStage("debrief_1");
                      }}
                      className="bg-page border border-slate-800 text-xs font-mono py-2 rounded-lg cursor-pointer hover:border-amber-500 transition-colors"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Medium paths (5-7): check specifics */}
          {guidedStep === "medium_racing" && (
            <div className="space-y-4" id="guided-medium-racing">
              <p className="text-sm font-semibold text-slate-100">
                What is the strongest unwanted filter right now?
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => setGuidedStep("medium_panic")}
                  className="w-full text-left bg-page border border-slate-800 p-3.5 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer hover:border-amber-500 transition-colors"
                >
                  Racing, chaotic thoughts spinning
                </button>
                <button
                  onClick={() => setGuidedStep("medium_harm")}
                  className="w-full text-left bg-page border border-slate-800 p-3.5 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer hover:border-amber-500 transition-colors"
                >
                  An intense urge to hurt myself or act impulsively
                </button>
                <button
                  onClick={() => setGuidedStep("medium_shame")}
                  className="w-full text-left bg-page border border-slate-800 p-3.5 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer hover:border-amber-500 transition-colors"
                >
                  Intense shame or hating myself
                </button>
              </div>
            </div>
          )}

          {guidedStep === "medium_panic" && (
            <div className="space-y-4" id="guided-panic">
              <div className="bg-page p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-slate-150 text-slate-100">Box Breathing Solution</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Box Breathing forces equalized CO2 levels in blood streams. Let's do 4-4-4-4 cycles: Breathe in 4s, Hold 4s, Out 4s, Hold 4s.
                </p>
              </div>
              <button
                onClick={() => setStage("debrief_1")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg text-xs cursor-pointer font-extrabold uppercase transition-all"
              >
                Complete Grounding Exercise
              </button>
            </div>
          )}

          {guidedStep === "medium_harm" && (
            <div className="space-y-4" id="guided-harm">
              <div className="bg-page p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-slate-150 text-slate-100">Wave Surfing Script</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Urges are like waves. They rise, peak, and inevitably fall if you do not feed them. Picture yourself on a secure surfboard. Press your feet down and stay steady — do not fight the urge. Just ride it out for 10 minutes.
                </p>
              </div>
              <button
                onClick={() => setStage("debrief_1")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg text-xs cursor-pointer font-extrabold uppercase transition-all"
              >
                Save Sensation Check
              </button>
            </div>
          )}

          {guidedStep === "medium_shame" && (
            <div className="space-y-4" id="guided-shame">
              <div className="bg-page p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="text-sm font-bold text-slate-150 text-slate-100 font-sans">Neff's Self-Compassion script</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  Take a self-compassion break. Read slowly: "This is hard. This pain is part of life. May I give myself the same kindness I'd offer to a dear friend in tears."
                </p>
              </div>
              <button
                onClick={() => setStage("debrief_1")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg text-xs cursor-pointer font-extrabold uppercase transition-all"
              >
                Proceed to debrief
              </button>
            </div>
          )}

          {guidedStep === "low_end" && (
            <div className="space-y-4" id="guided-low">
              <p className="text-sm text-slate-300 font-sans">
                You're in a steadier place. Let's calm our systems down and proceed to a gentle closure.
              </p>
              <button
                onClick={() => setStage("debrief_1")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg text-xs cursor-pointer font-extrabold uppercase transition-all"
              >
                Safe Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* DEBRIEF SCREEN 1 OF 3 (OPTIONAL TRIGGER EXPLAIN) */}
      {stage === "debrief_1" && (
        <div className="bg-card border border-slate-800 p-6 rounded-2xl space-y-6" id="debrief-step-1">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100 font-sans">Closing Recovery Debrief</h2>
            <p className="text-xs text-slate-500 font-mono">Step 1 of 3: Tracking trigger context</p>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-slate-300 block">
              What triggered this acute episode? (Optional)
            </label>
            <textarea
              aria-label="What triggered this acute episode? (Optional)"
              value={triggerExplanation}
              onChange={(e) => setTriggerExplanation(e.target.value)}
              className="w-full h-32 bg-page border border-slate-850 rounded-xl px-4 py-3 text-sm text-slate-350 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all resize-none"
              placeholder="e.g. Perceived rejection, severe work disappointment, lack of sleep..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                setTriggerExplanation("");
                setStage("debrief_2");
              }}
              className="bg-page hover:bg-slate-800 border border-slate-800 text-xs font-semibold py-3.5 rounded-xl cursor-pointer text-slate-300 transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSaveDebrief1}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black py-3 rounded-xl cursor-pointer font-extrabold transition-all"
            >
              Save & Next
            </button>
          </div>
        </div>
      )}

      {/* DEBRIEF SCREEN 2 OF 3 (WHAT HELPED WORKBOOK) */}
      {stage === "debrief_2" && (
        <div className="bg-card border border-slate-800 p-6 rounded-2xl space-y-6" id="debrief-step-2">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Debrief: Coping Verification</h2>
            <p className="text-xs text-slate-500 font-mono">Step 2 of 3: Check which skills helped you</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-105 text-slate-300 font-bold block mb-1">
              What helped most during this session? Toggle helpers:
            </p>
            <div className="grid grid-cols-2 gap-2" id="debrief-skills-checklist">
              {["TIPP", "Box Breathing", "Opposite Action", "Radical Acceptance", "Self-Compassion Break", "Distraction", "Human Connection"].map((s) => {
                const checked = skillsSelected.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleToggleDebriefSkill(s)}
                    className={`flex items-center gap-2 p-3 text-xs rounded-xl border text-left transition-all cursor-pointer ${
                      checked
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold"
                        : "bg-page border-slate-850 text-slate-500 hover:border-slate-700"
                    }`}
                  >
                    <span>{s}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => setStage("debrief_3")}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3.5 rounded-xl text-center text-xs transition-all cursor-pointer uppercase font-black"
          >
            Continue
          </button>
        </div>
      )}

      {/* DEBRIEF SCREEN 3 OF 3 (INTENSITY LOCK-OUT OUTCOME) */}
      {stage === "debrief_3" && (
        <div className="bg-card border border-slate-800 p-6 rounded-2xl space-y-6" id="debrief-step-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Debrief: Intensity Journey</h2>
            <p className="text-xs text-slate-500">Step 3 of 3: Rate your final current state</p>
          </div>

          {/* Intenisty Side-by-Side comparator mapping */}
          <div className="grid grid-cols-2 gap-4 bg-page p-4 rounded-xl border border-slate-850">
            <div className="text-center space-y-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">When you started</span>
              <p className="text-4xl font-extrabold text-amber-500 font-mono">
                {intensityList[0] || 8}/10
              </p>
            </div>
            
            <div className="text-center space-y-1 border-l border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">Highest point</span>
              <p className="text-4xl font-extrabold text-rose-450 text-rose-400 font-mono">
                {Math.max(...intensityList, intensityList[0] || 8)}/10
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-center text-slate-105 text-slate-200 font-bold">
              Where is your intensity rating ending up right now?
            </p>
            
            <div className="grid grid-cols-5 gap-2" id="debrief-intensity-selectors">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => saveEpisodeRecord(num)}
                  className="bg-page border border-slate-800 text-slate-200 hover:bg-amber-500 hover:text-slate-950 font-bold py-3 rounded-xl transition-all font-mono cursor-pointer text-center text-sm"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FINALIZED CONFIRMATION SHEET */}
      {stage === "saved" && (
        <div className="bg-card border border-emerald-500 p-6 rounded-2xl text-center space-y-6" id="debrief-saved-sheet">
          <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
            <Save className="w-6 h-6" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-100">Session Saved Offline</h2>
            <p className="text-sm text-slate-350">
              You got through it. That matters more than it might feel right now.
            </p>
          </div>

          <button
            onClick={() => {
              setStage("opening");
              setMessages([]);
              setIntensityList([]);
              setSkillsSelected([]);
              setTriggerExplanation("");
              setElapsedSeconds(0);
              onSessionEnded();
            }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all font-extrabold"
          >
            Return to Dashboard
          </button>
        </div>
      )}

    </div>
  );
}
