import { localDateKey } from "../services/storageUtils";
import { secureLocal, appendToSecureArray } from "../services/secureLocal";
import React, { useState, useEffect, useRef } from "react";
import { getCrisisReply } from "../safety";
import { detectCrisis } from "../services/crisisClassifier";
import { logNilaTurn } from "../services/nilaSessions";
import CrisisLines from "./CrisisLines";
import { Shield, Save, LogOut } from "lucide-react";
import { EpisodeRecord } from "../types";
import { sendToNila } from "../services/sendToNila";
import { NilaUiMessage } from "../services/nilaSend";
import { notifyReplyReady } from "../services/notifications";
import TIPPTool from "./TIPPTool";
import ChatLoading from "./ChatLoading";

interface EpisodeSupportScreenProps {
  onSessionEnded: () => void;
  onNavigateToGrounding: () => void;
  onNavigateToBreathing: () => void;
}

/** Episode Support steer — added to Nila's unified companion persona instead of replacing it.
 *  Keeps the acute-session structure and safety rules, but drops the robotic 6-step script so the
 *  episode voice matches the fine-tuned companion (audit fix #2). */
export const EPISODE_STEER_PROMPT = `
EPISODE SUPPORT STEER

The person has opened Episode Support — they're in an acute moment and want help getting through the next 20–40 minutes. Stay in your warm, steady friend voice. A few things shift in this mode:

- They may be overwhelmed, so keep replies shorter than usual. Lead with understanding, then offer ONE concrete skill as an invitation — "want to try something small with me?" Never list several.
- Match the intensity they report:
  • 8–10 (extreme): body-first — TIPP temperature reset, paced breathing. The thinking brain is offline; biology first.
  • 6–7 (high): grounding, box breathing, opposite action if the urge is self-harm.
  • 4–5 (moderate): check the facts, thought record, opposite action.
  • 2–3 (lower): values, behavioural activation, self-compassion break.
- Gently check intensity now and then so they can notice shifts, but don't turn the chat into a checklist.
- If distress stays high or the session has been going a while, keep naming the human option. You can't replace a person who can be there with them.
- Validate emotions, never distortions. "That pain is real" is right; "you're right, nobody loves you" is harmful. Name all-or-nothing splitting gently.
- The same safety rules apply: never diagnose, never shame, never agree with dangerous content, and if they mention wanting to die or hurt themselves, stop everything and reply ONLY with the crisis lines.
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

  // Offline Guided steps indexes (Doc 1 Step 5 path tracking).
  // 2026-07-12 Wave 3, Group E: the 8-10/extreme path used to be a 3-step static-text walkthrough
  // (extreme_tipp_1/2/3, T→I→P only — it entirely omitted Paired Muscle Relaxation). It's now a
  // single "extreme_tipp" step that mounts the full unified interactive TIPPTool (all 4 letters,
  // user picks whichever fits — per DBT's "use whichever piece fits" guidance).
  const [guidedStep, setGuidedStep] = useState<"init" | "extreme_tipp" | "medium_racing" | "medium_harm" | "medium_shame" | "medium_panic" | "low_end">("init");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer loop
  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive]);

  // Scroll to bottom helper
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isWaitingForIntensityUpdate, escalationShown]);

  const handleStartSession = async () => {
    if (!chatInput.trim()) return;
    const initialText = chatInput.trim();
    setChatInput("");
    setStage("chat");
    setConnectedLive(false); // re-confirm live connection each session
    setElapsedSeconds(0);
    setTimerActive(true);

    const initialHistory: NilaUiMessage[] = [{ role: "user", content: initialText }];
    setMessages(initialHistory);

    // Initial scan — crisis text never leaves the device. detectCrisis = keyword floor OR (when enabled)
    // the on-device semantic classifier, so euphemistic crises the keyword list misses are caught too;
    // fail-closed. Instant on a keyword hit; nothing is sent to the model on a crisis.
    const isCrisis = await detectCrisis(initialText);
    if (isCrisis) {
      setIsCrisisMode(true);
      setMessages([...initialHistory, { role: "assistant", content: getCrisisReply() }]);
      return; // #5 (audit): return BEFORE logging — a crisis snippet must never be persisted or shown on the dashboard
    }
    // #5 (audit): log only AFTER passing the §9 check (was logged before, storing crisis text at rest + on the dashboard).
    logNilaTurn("episode", initialText);

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
    if (document.hidden) void notifyReplyReady();
  };

  const handleSendChat = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || loading || isCrisisMode) return;

    const userText = chatInput.trim();
    setChatInput("");

    const updatedHistory: NilaUiMessage[] = [...messages, { role: "user", content: userText }];
    setMessages(updatedHistory);

    // Pre-send crisis scan — crisis text NEVER reaches the network. detectCrisis = keyword floor OR the
    // on-device semantic classifier (fail-closed), so euphemistic crises are caught. sendToNila also scans
    // internally but we short-circuit here so we can set isCrisisMode and avoid calling it (no double-send).
    if (await detectCrisis(userText)) {
      setIsCrisisMode(true);
      setMessages([...updatedHistory, { role: "assistant", content: getCrisisReply() }]);
      return; // #5 (audit): return BEFORE logging so the crisis snippet is never persisted/shown
    }
    // #5 (audit): log only after passing the §9 check.
    logNilaTurn("episode", userText);

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
    if (document.hidden) void notifyReplyReady();
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
      date: localDateKey(),
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

    appendToSecureArray<EpisodeRecord>("nilamind_episodes", epEntry);

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
    <div className="space-y-6 max-w-md mx-auto text-ink-2" id="episode-agent-wrapper">
      
      {/* 20-Minute inline Amber Warning */}
      {escalationShown && stage === "chat" && (
        <div className="bg-amber-500/10 border-y border-r border-line border-l-4 border-l-amber-500 p-4 rounded-r-xl space-y-4" id="escalation-alert-panel">
          <p className="text-sm font-semibold text-ink">
            You've been in this for 20 minutes and you're still at high intensity.
          </p>
          <p className="text-xs text-ink-2 leading-relaxed">
            This is the moment for a human. Not because I can't help — because humans can do something I genuinely cannot: exist with you physically and hear your voice.
          </p>
          
          <div className="space-y-2">
            <CrisisLines tone="amber" />
            <button
              onClick={() => setEscalationShown(false)}
              className="w-full bg-card border border-line text-xs text-ink-2 py-3 rounded-xl transition-all cursor-pointer hover:bg-fill"
            >
              Keep talking with Nila
            </button>
          </div>
        </div>
      )}

      {/* STAGE: OPENING PANEL */}
      {stage === "opening" && (
        <div className="bg-card border border-line border-l-4 border-l-amber-500 p-6 rounded-r-2xl space-y-6 relative" id="episode-opening-container">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">I'm here.</h1>
            <p className="text-sm text-ink-2 leading-relaxed">
              This is your episode support tool — an AI, not a person. I cannot replace a human but I can help you secure grounded thoughts to navigate the next few minutes.
            </p>
            <p className="text-sm text-ink font-bold">
              What is happening right now?
            </p>
          </div>

          <div className="space-y-4">
            <textarea
              aria-label="Message Nila"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="w-full h-36 bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all resize-none"
              placeholder="Explain how you feel, what triggered you, or what unwanted urge you have... (text is 100% secure/private)"
              id="episode-starter-input"
            />

            <button
              onClick={handleStartSession}
              disabled={!chatInput.trim()}
              className={`w-full py-4 rounded-xl font-bold transition-all text-sm cursor-pointer flex items-center justify-center gap-2 ${
                chatInput.trim()
                  ? "bg-amber-500 hover:bg-amber-450 hover:bg-amber-400 text-slate-950 font-extrabold"
                  : "bg-page text-ink-faint border border-line cursor-not-allowed"
              }`}
              id="start-episode-btn"
            >
              Start Episode Support
            </button>
          </div>

          <p className="text-xs text-center text-ink-faint leading-relaxed font-sans">
            Nila runs entirely on your device — no connection needed. If the model is still loading, the secure Guided Mode runs automatically.
          </p>
        </div>
      )}

      {/* STAGE: ACTIVE CHAT VIEW */}
      {stage === "chat" && (
        <div className="flex flex-col h-[76dvh] bg-page border border-line rounded-2xl overflow-hidden relative" id="episode-chat-dock">
          {/* Header Row */}
          <div className="bg-card py-3.5 px-4 border-b border-line flex justify-between items-center shrink-0">
            <button
              onClick={handleEndSession}
              className="text-xs text-ink-faint hover:text-ink-2 flex items-center gap-1 cursor-pointer transition-colors"
              id="end-episode-session-btn"
            >
              <LogOut className="w-3.5 h-3.5" /> End Session
            </button>
            {connectedLive && (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-400" id="episode-live-badge" title="Nila is running on-device">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Nila · on-device</span>
              </div>
            )}
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-ink-muted">
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
                        ? "bg-card text-ink-2 border border-line"
                        : "bg-card text-ink-2 border-y border-r border-slate-850 border-l-4 border-l-amber-500 rounded-bl-none"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <ChatLoading />
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Controls Segment */}
          <div className="p-3 bg-card border-t border-line">
            <div className="pb-2 space-y-1.5">
              <p className="text-xs text-ink-faint font-mono tracking-wider uppercase text-center">
                Not a therapist. Not a diagnosis tool.
              </p>
              {/* Real tappable crisis lines (tel: links) — the numbers were previously plain text. */}
              <p className="text-xs text-rose-200 font-semibold text-center">In crisis? Tap to call now:</p>
              <CrisisLines tone="rose" compact />
            </div>
            {isCrisisMode ? (
              <div className="space-y-2">
                <div className="text-xs text-rose-400 font-semibold text-center bg-rose-500/10 border border-rose-500/20 rounded-xl py-2 flex items-center justify-center gap-1.5">
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
                <div className="text-xs font-bold text-center text-ink-faint">
                  Select your current intensity (1 is calm, 10 is crisis limit):
                </div>
                <div className="grid grid-cols-5 gap-2" id="intensity-locks">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => registerIntensityAndTriggerAI(num)}
                      className="bg-page border border-slate-850 border-line text-ink hover:border-amber-500 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-sm"
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
                  className="flex-1 bg-page border border-slate-850 border-line text-xs text-ink rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
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
        <div className="bg-card border border-line p-6 rounded-2xl space-y-6" id="offline-guided-container">
          <div className="flex justify-between items-center border-b border-line pb-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-1.5 font-sans">
              <Shield className="w-5 h-5 text-amber-500" /> Guided Offline Mode
            </h2>
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-sans">
              No Connection Needed
            </span>
          </div>

          {/* Guided Branching Step: init */}
          {guidedStep === "init" && (
            <div className="space-y-5" id="guided-init">
              <p className="text-sm text-ink-2 leading-relaxed">
                The AI companion isn't reachable right now, but I can still walk you through this. Let's go step by step.
              </p>
              <p className="text-sm font-semibold text-ink">
                How intense is what you're feeling right now?
              </p>
              
              <div className="grid grid-cols-5 gap-2" id="guided-intensity-options">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setIntensityList([...intensityList, num]);
                      if (num >= 8) {
                        setGuidedStep("extreme_tipp");
                      } else if (num >= 5) {
                        setGuidedStep("medium_racing"); // prompt question
                      } else {
                        setGuidedStep("low_end");
                      }
                    }}
                    className="bg-page border border-line hover:bg-amber-500 hover:text-slate-950 py-3.5 rounded-xl font-mono text-sm cursor-pointer font-bold text-center text-ink-2 transition-colors"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Extreme path (8-10): the unified interactive TIPP tool — DBT's "use whichever piece
              fits" guidance, so the person can jump straight to whatever helps rather than being
              forced through a fixed T→I→P order (and, unlike the old 3-step walkthrough, PMR is no
              longer skipped entirely — 2026-07-12 Wave 3, Group E). */}
          {guidedStep === "extreme_tipp" && (
            <div className="space-y-4" id="tipp-step-guided">
              <div className="p-4 bg-amber-500/10 border-y border-r border-slate-850 border-l-4 border-l-amber-500 rounded-r-xl">
                <h4 className="text-sm font-bold text-ink mb-1 font-sans">Biological shock reset</h4>
                <p className="text-xs text-ink-2 leading-relaxed">
                  Your intensity is extreme. This means your thinking brain is offline. This is biology, not weakness. Try whichever of these fits right now.
                </p>
              </div>

              <TIPPTool
                onSubSkillComplete={() => {
                  setSkillsSelected((prev) => (prev.includes("TIPP") ? prev : [...prev, "TIPP"]));
                }}
                onIntensityChange={(num) => setIntensityList((prev) => [...prev, num])}
              />

              <button
                onClick={() => setStage("debrief_1")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider cursor-pointer text-center font-extrabold"
              >
                I'm ready to close out
              </button>
            </div>
          )}

          {/* Medium paths (5-7): check specifics */}
          {guidedStep === "medium_racing" && (
            <div className="space-y-4" id="guided-medium-racing">
              <p className="text-sm font-semibold text-ink">
                What is the strongest unwanted filter right now?
              </p>
              
              <div className="space-y-2">
                <button
                  onClick={() => setGuidedStep("medium_panic")}
                  className="w-full text-left bg-page border border-line p-3.5 rounded-xl text-xs font-semibold text-ink-2 cursor-pointer hover:border-amber-500 transition-colors"
                >
                  Racing, chaotic thoughts spinning
                </button>
                <button
                  onClick={() => setGuidedStep("medium_harm")}
                  className="w-full text-left bg-page border border-line p-3.5 rounded-xl text-xs font-semibold text-ink-2 cursor-pointer hover:border-amber-500 transition-colors"
                >
                  An intense urge to hurt myself or act impulsively
                </button>
                <button
                  onClick={() => setGuidedStep("medium_shame")}
                  className="w-full text-left bg-page border border-line p-3.5 rounded-xl text-xs font-semibold text-ink-2 cursor-pointer hover:border-amber-500 transition-colors"
                >
                  Intense shame or hating myself
                </button>
              </div>
            </div>
          )}

          {guidedStep === "medium_panic" && (
            <div className="space-y-4" id="guided-panic">
              <div className="bg-page p-4 rounded-xl border border-line space-y-2">
                <h4 className="text-sm font-bold text-slate-150 text-ink">Box Breathing</h4>
                <p className="text-xs text-ink-2 leading-relaxed font-sans">
                  Slow, even breathing steadies your body and helps calm a racing mind. Let's do 4-4-4-4 cycles: breathe in 4s, hold 4s, out 4s, hold 4s.
                </p>
              </div>
              <button
                onClick={() => setStage("debrief_1")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg text-xs cursor-pointer font-extrabold uppercase transition-all"
              >
                Done
              </button>
            </div>
          )}

          {guidedStep === "medium_harm" && (
            <div className="space-y-4" id="guided-harm">
              <div className="bg-page p-4 rounded-xl border border-line space-y-2">
                <h4 className="text-sm font-bold text-slate-150 text-ink">Wave Surfing Script</h4>
                <p className="text-xs text-ink-2 leading-relaxed font-sans">
                  Urges are like waves. They rise, peak, and inevitably fall if you do not feed them. Picture yourself on a secure surfboard. Press your feet down and stay steady — do not fight the urge. Just ride it out for 10 minutes.
                </p>
              </div>
              <button
                onClick={() => setStage("debrief_1")}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-lg text-xs cursor-pointer font-extrabold uppercase transition-all"
              >
                Done
              </button>
            </div>
          )}

          {guidedStep === "medium_shame" && (
            <div className="space-y-4" id="guided-shame">
              <div className="bg-page p-4 rounded-xl border border-line space-y-2">
                <h4 className="text-sm font-bold text-slate-150 text-ink font-sans">Neff's Self-Compassion script</h4>
                <p className="text-xs text-ink-2 leading-relaxed font-sans">
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
              <p className="text-sm text-ink-2 font-sans">
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
        <div className="bg-card border border-line p-6 rounded-2xl space-y-6" id="debrief-step-1">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink font-sans">Closing Recovery Debrief</h2>
            <p className="text-xs text-ink-faint font-mono">Step 1 of 3: Tracking trigger context</p>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-medium text-ink-2 block">
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
              className="bg-page hover:bg-fill border border-line text-xs font-semibold py-3.5 rounded-xl cursor-pointer text-ink-2 transition-colors"
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
        <div className="bg-card border border-line p-6 rounded-2xl space-y-6" id="debrief-step-2">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">Debrief: Coping Verification</h2>
            <p className="text-xs text-ink-faint font-mono">Step 2 of 3: Check which skills helped you</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-ink-2 font-bold block mb-1">
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
                        : "bg-page border-slate-850 text-ink-faint hover:border-line-strong"
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
        <div className="bg-card border border-line p-6 rounded-2xl space-y-6" id="debrief-step-3">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">Debrief: Intensity Journey</h2>
            <p className="text-xs text-ink-faint">Step 3 of 3: Rate your final current state</p>
          </div>

          {/* Intenisty Side-by-Side comparator mapping */}
          <div className="grid grid-cols-2 gap-4 bg-page p-4 rounded-xl border border-slate-850">
            <div className="text-center space-y-1">
              <span className="text-xs text-ink-faint uppercase tracking-wide">When you started</span>
              <p className="text-4xl font-extrabold text-amber-500 font-mono">
                {intensityList[0] || 8}/10
              </p>
            </div>
            
            <div className="text-center space-y-1 border-l border-line">
              <span className="text-xs text-ink-faint uppercase tracking-wide">Highest point</span>
              <p className="text-4xl font-extrabold text-rose-400 font-mono">
                {Math.max(...intensityList, intensityList[0] || 8)}/10
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-center text-ink-2 font-bold">
              Where is your intensity rating ending up right now?
            </p>
            
            <div className="grid grid-cols-5 gap-2" id="debrief-intensity-selectors">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => saveEpisodeRecord(num)}
                  className="bg-page border border-line text-ink-2 hover:bg-amber-500 hover:text-slate-950 font-bold py-3 rounded-xl transition-all font-mono cursor-pointer text-center text-sm"
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
            <h2 className="text-lg font-bold text-ink">Session Saved Offline</h2>
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
            I'm done for now
          </button>
        </div>
      )}

    </div>
  );
}
