import React, { useState, useEffect, useRef } from "react";
import { logNilaTurn } from "../services/nilaSessions";
import { nilaWelcome } from "../services/nila";
import { detectCrisis } from "../services/crisisClassifier";
import { useSettlingNote } from "./useSettlingNote";
import PactNoticeBanner from "./PactNoticeBanner";
import { activePactNotice, type PactNotice } from "../services/pactNotice";
import DependencyNudge from "./DependencyNudge";
import { activeDependencyNudge } from "../services/dependencyGuard";
import { rememberSession } from "../services/nilaMemory";
import { speakIfEnabled, speak, listenOnce, stopSpeaking } from "../services/voice";
import { runAgent, AgentView } from "../services/agent";
import { hasCheckinToday, getSkipFlag, setSkipFlag } from "../services/checkin";
import { secureLocal } from "../services/secureLocal";
import { cardsForCheckin, NilaCard } from "../services/nilaOrchestration";
import { cardsForReply } from "../services/nilaCards";
import { getInflectionEnabled } from "../services/inflectionPrefs";
import { recordDetectionPass, surfaceOpener, acknowledgeInflection, type InflectionSignal } from "../services/nilaInflection";
import { actionForCard } from "../services/nilaCardDispatch";
import NilaCheckIn from "./NilaCheckIn";
import type { CheckInEntry } from "../types";
import { sendToNila } from "../services/sendToNila";
import { NilaMode, NilaUiMessage } from "../services/nilaSend";
import EpisodeSupportScreen from "./EpisodeSupportScreen";
import NilaOrb from "./NilaOrb";
import { Send, AlertTriangle, Shield, Volume2, VolumeX, Mic, Sparkles, BookOpen, ChevronRight, Phone, Zap, Brain, ClipboardList, LifeBuoy, ThumbsUp, ThumbsDown, Keyboard } from "lucide-react";
import { recordFeedback, attachSuggestion, type Rating, type ReplyFeedback } from "../services/nilaFeedback";
import { buildDonationPreview, confirmDonation, revokeDonation } from "../services/nilaContributions";

type Message = NilaUiMessage;

interface AiCoachScreenProps {
  mode: NilaMode;
  onModeChange: (m: NilaMode) => void;
  onNavigateToGrounding: () => void;
  onNavigateToBreathing: () => void;
  onAgentNavigate?: (view: AgentView) => void;
  onOpenSkill?: (skillId: string) => void;
  onStartCall?: () => void;
  onEnterEpisode: () => void;
  onLaunchScreening: (instrument: "PHQ-9" | "GAD-7") => void;
  onActivateCrisis?: () => void;
}

/** Compute the "show check-in?" gate using the same `today` string for both tests. */
function shouldShowCheckin(): boolean {
  const today = new Date().toISOString().split("T")[0];
  return !hasCheckinToday(today) && getSkipFlag() !== today;
}

/** Read all persisted check-ins from encrypted storage; returns [] on any failure. */
function readRecentCheckins(): CheckInEntry[] {
  try {
    const raw = secureLocal.getItem("nilamind_checkins");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AiCoachScreen({ mode, onModeChange, onNavigateToGrounding, onNavigateToBreathing, onAgentNavigate, onOpenSkill, onStartCall, onEnterEpisode, onLaunchScreening, onActivateCrisis }: AiCoachScreenProps) {
  // Check-in gate: computed ONCE at component init, shared by showCheckin + messages initializer.
  // Using a ref-based init pattern to avoid calling shouldShowCheckin() twice.
  const initCheckin = useRef<boolean>(shouldShowCheckin());
  const [showCheckin, setShowCheckin] = useState<boolean>(initCheckin.current);
  // Cards surfaced by cardsForCheckin after a completed check-in; empty until onLogged fires.
  const [nilaCards, setNilaCards] = useState<NilaCard[]>([]);

  // Seed the welcome message only once the check-in is dismissed (logged or skipped).
  const [messages, setMessages] = useState<Message[]>(() =>
    initCheckin.current ? [] : [{ role: "assistant", content: nilaWelcome() }]
  );
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const thinkingNote = useSettlingNote(loading, "Nila is thinking..."); // calm copy that escalates if the on-device reply runs long
  const [activeTier, setActiveTier] = useState<"OnDevice" | "Offline mode">("OnDevice");
  const [isCrisisState, setIsCrisisState] = useState<boolean>(false);
  const [pactNotice, setPactNotice] = useState<PactNotice | null>(null);
  const [dependencyNudge, setDependencyNudge] = useState<boolean>(false);
  // On-device feedback on Nila's replies — the privacy-preserving improvement signal. All idx-keyed,
  // all stored locally (services/nilaFeedback); nothing uploads.
  const [fbGiven, setFbGiven] = useState<Record<number, Rating>>({});
  const [fbId, setFbId] = useState<Record<number, string>>({});
  const [suggestIdx, setSuggestIdx] = useState<number | null>(null);
  const [suggestDraft, setSuggestDraft] = useState<string>("");
  // Donate flow (P0b) — OFF by default, per-reply, previewed verbatim, revocable. A donation only ever
  // carries Nila's reply + the person's wording (see nilaContributions); crisis-flagged replies are never offered.
  const [suggestText, setSuggestText] = useState<Record<number, string>>({}); // saved suggestion per reply, for the preview
  const [donateIdx, setDonateIdx] = useState<number | null>(null);            // reply currently offered for donation
  const [donatePreviewOpen, setDonatePreviewOpen] = useState<boolean>(false); // verbatim "what's shared" expanded
  const [donatedIdx, setDonatedIdx] = useState<Record<number, boolean>>({});  // donated → shows thanks + undo
  const fbEntry = (idx: number, reply: string): ReplyFeedback => ({
    id: fbId[idx] ?? "", at: "", rating: "down", reply, suggestion: suggestText[idx] ?? "",
  });
  const [listening, setListening] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  // Keep a live handle on the latest messages so the unmount cleanup can summarise the real session.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Inflection opener (Phase 2): pick at most once per mount; gated by the off-by-default toggle,
  // the once/day cap, and §9. recordDetectionPass() logs silently regardless of the toggle.
  const openerPicked = useRef(false);
  const [openerSig, setOpenerSig] = useState<InflectionSignal | null>(null);
  const [openerDone, setOpenerDone] = useState(false);
  const pickOpener = (): InflectionSignal | null => {
    recordDetectionPass();                       // silent log; runs regardless of the toggle
    if (openerPicked.current || isCrisisState || !getInflectionEnabled()) return null;
    openerPicked.current = true;
    return surfaceOpener();
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // When the user leaves Nila, quietly remember this talk (one note) — cross-session memory.
  useEffect(() => () => { void rememberSession(messagesRef.current); }, []);

  // Pre-load the §9 crisis embedder off the hot path so it isn't competing for CPU with the first reply.
  // (We deliberately do NOT pre-warm the LLM: on the llama-cpp binding completion() runs synchronously on
  // Capacitor's single plugin thread, so a background warm freezes every native plugin — incl. the call
  // greeting's TTS — for the whole cold prefill. The first message pays that prefill instead; see
  // warmLocalLlm.) Companion mode only (episode uses a different prompt).
  useEffect(() => {
    if (mode !== "companion") return;
    void detectCrisis("hello").catch(() => {}); // load the classifier embedder off the hot path
    setPactNotice(activePactNotice()); // surface the user's pact if a real shift is noticed (read-only, dismissible)
    setDependencyNudge(activeDependencyNudge()); // nudge toward a human if Nila use is heavy + escalating
  }, []);

  // Same-day reopen (no check-in due): the welcome is already seeded — swap in an opener if one fires.
  // Runs after first render, so pickOpener + isCrisisState are fully declared; openerPicked keeps it
  // idempotent under StrictMode's double-invoke.
  useEffect(() => {
    if (initCheckin.current) return;             // check-in path seeds its own opener in the handlers
    const sig = pickOpener();
    if (sig) { setOpenerSig(sig); setMessages([{ role: "assistant", content: sig.opener }]); }
  }, []);

  // ── Check-in handlers ──────────────────────────────────────────────────────

  /**
   * Called by NilaCheckIn once the entry is persisted (appendCheckin already ran).
   * 1. Read all recent check-ins (appendCheckin's write is synchronous in secureLocal cache).
   * 2. Compute orchestration cards from cardsForCheckin.
   * 3. Hide the check-in widget, seed the welcome message, show cards.
   */
  const handleCheckinLogged = (entry: CheckInEntry) => {
    const recent = readRecentCheckins();
    const cards = cardsForCheckin(entry, recent);
    const sig = pickOpener();
    if (sig) setOpenerSig(sig);
    // A DETERIORATION opener owns the "consider this" nudge — drop the duplicate screening card so the
    // user isn't double-tapped (covers mood_trend AND a same-window screening_change rise).
    const shown = sig && sig.direction === "deterioration" ? cards.filter((c) => c.kind !== "screening") : cards;
    setNilaCards(shown);
    setShowCheckin(false);
    setMessages([{ role: "assistant", content: sig ? sig.opener : nilaWelcome() }]);
  };

  /**
   * Called when user taps "I just want to talk" (top-level skip).
   * NilaCheckIn calls onSkip() without calling setSkipFlag — that responsibility lives here
   * so the parent controls the gate (brief §gate).
   */
  const handleCheckinSkip = () => {
    const today = new Date().toISOString().split("T")[0];
    setSkipFlag(today);
    const sig = pickOpener();
    if (sig) setOpenerSig(sig);
    setShowCheckin(false);
    setMessages([{ role: "assistant", content: sig ? sig.opener : nilaWelcome() }]);
  };

  // Voice-first: speak Nila's replies aloud by default (persisted); the mute toggle lives in the input row.
  const [voiceMode, setVoiceMode] = useState<boolean>(() => {
    try { return (globalThis as any).localStorage?.getItem("nilamind_home_voice") !== "0"; } catch { return true; }
  });
  const toggleVoiceMode = () => setVoiceMode((v) => {
    const next = !v;
    try { (globalThis as any).localStorage?.setItem("nilamind_home_voice", next ? "1" : "0"); } catch { /* ignore */ }
    if (!next) void stopSpeaking(); // muting stops any in-progress speech immediately
    return next;
  });
  const speakReply = (t: string) => { if (voiceMode) void speak(t); else void speakIfEnabled(t); };
  const [typingMode, setTypingMode] = useState<boolean>(false); // voice-first: typing is opt-in

  const handleSendMessage = async (e?: React.FormEvent, override?: string) => {
    if (e) e.preventDefault();
    const raw = (override ?? inputText).trim(); // override = spoken text from the voice-forward hero
    if (!raw || loading) return;

    if (openerSig && !openerDone) setOpenerDone(true); // typed instead of tapped = consequence-free wave-off (no ack)

    const userText = raw;
    setInputText("");
    logNilaTurn(mode === "episode" ? "episode" : "coach", userText);

    const newMessages: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);

    // 1. On-device agentic command pre-pass (companion only) — actionable commands handled locally,
    //    never sent to the model. Episode mode goes straight to the clinical send path.
    if (mode === "companion") {
      try {
        const action = await runAgent(userText);
        if (action.handled) {
          setMessages((prev) => [...prev, { role: "assistant", content: action.reply }]);
          speakReply(action.reply);
          if (action.navigate) {
            const view = action.navigate;
            setTimeout(() => onAgentNavigate?.(view), 650);
          }
          return;
        }
      } catch (err) {
        console.warn("Nila agent error — handling as a normal message:", err);
      }
    }

    setLoading(true);

    // 2. Unified, crisis-gated send. sendToNila scans for crisis BEFORE any network call (both modes),
    //    strips synthetic turns, runs the output-safety gate, and streams via onDelta.
    let started = false;
    let streamed = "";
    const result = await sendToNila(newMessages, mode, {
      onDelta: (t) => {
        streamed += t;
        if (!started) {
          started = true;
          setLoading(false);
          setMessages((prev) => [...prev, { role: "assistant", content: streamed }]);
        } else {
          setMessages((prev) => {
            const copy = prev.slice();
            copy[copy.length - 1] = { role: "assistant", content: streamed };
            return copy;
          });
        }
      },
    });

    // Crisis short-circuit — text never left the device; show the deterministic crisis reply.
    if (result.blocked) {
      setIsCrisisState(true);
      setLoading(false);
      setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      return;
    }

    let coachReply = "";
    if (result.reachedAI) {
      coachReply = result.reply || streamed || "Okay — done.";
      setActiveTier("OnDevice");
    } else {
      setActiveTier("Offline mode");
      coachReply = "Nila's on-device model isn't ready yet — it may still be loading. Your safety and grounding tools are pre-loaded and always work. Tap below to navigate:";
    }

    setLoading(false);
    setMessages((prev) => {
      const copy = prev.slice();
      if (started && copy.length && copy[copy.length - 1].role === "assistant") {
        copy[copy.length - 1] = { role: "assistant", content: coachReply };
        return copy;
      }
      return [...copy, { role: "assistant", content: coachReply }];
    });
    speakReply(coachReply);

    if (result.reachedAI && result.openSkillId && onOpenSkill) {
      const id = result.openSkillId;
      setTimeout(() => onOpenSkill(id), 700);
    } else if (result.reachedAI && result.navigate && onAgentNavigate) {
      const view = result.navigate;
      setTimeout(() => onAgentNavigate(view), 700);
    }
  };

  // Voice input: listen once and drop the transcript into the input box.
  const handleMic = async () => {
    if (listening || loading) return;
    setListening(true);
    try {
      const text = await listenOnce();
      if (text) setInputText((cur) => (cur ? cur + " " : "") + text);
    } catch (e) {
      console.warn("Speech input unavailable:", e);
    } finally {
      setListening(false);
    }
  };

  // Voice-forward home: the big mic hero LISTENS then sends straight away (talk → Nila replies inline),
  // vs the input-bar mic which only fills the box for editing. Same on-device STT; same crisis-gated send.
  const handleVoiceTalk = async () => {
    if (listening || loading) return;
    setListening(true);
    let spoken = "";
    try {
      spoken = (await listenOnce()) || "";
    } catch (e) {
      console.warn("Speech input unavailable:", e);
    } finally {
      setListening(false);
    }
    if (spoken.trim()) await handleSendMessage(undefined, spoken.trim());
  };

  const dispatchCard = (card: NilaCard) => {
    const a = actionForCard(card);
    if (!a) return;
    if (a.type === "grounding") onNavigateToGrounding();
    else if (a.type === "episode") onEnterEpisode();
    else if (a.type === "skill") onOpenSkill?.(a.skillId);
    else if (a.type === "screening") onLaunchScreening(a.instrument);
  };

  // (Tier label/icon removed with the top toolbar; the offline state still surfaces via the banner below.)

  if (mode === "episode") {
    return (
      <EpisodeSupportScreen
        onSessionEnded={() => onModeChange("companion")}
        onNavigateToGrounding={onNavigateToGrounding}
        onNavigateToBreathing={onNavigateToBreathing}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 w-full max-w-md mx-auto relative bg-page overflow-hidden" id="ai-coach-screen">
      {/* Top toolbar removed (voice-forward redesign). §9 SAFETY is non-negotiable, so the crisis line
          stays reachable as a subtle, always-visible floating button instead of a header item. */}
      {onActivateCrisis && (
        <button
          onClick={onActivateCrisis}
          id="coach-crisis-btn"
          aria-label="Crisis support and safety plan"
          title="Crisis support"
          className="absolute top-3 right-3 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-card/70 backdrop-blur-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 cursor-pointer transition-colors"
        >
          <LifeBuoy className="w-5 h-5" />
        </button>
      )}

      {/* Offline banner — honest, unmistakable signal that replies are built-in, not the on-device AI */}
      {activeTier === "Offline mode" && (
        <div className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-start gap-2 shrink-0" id="coach-offline-banner">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            <span className="font-semibold text-amber-300">Nila's on-device model isn't ready yet.</span> These are built-in coping responses, not the AI — your safety &amp; grounding tools always work.
          </p>
        </div>
      )}

      {/* Proactive pact notice — surfaces the user's own letter when a real shift is noticed; hidden during
          crisis so §9 always takes precedence. Read-only + dismissible; Nila never acts on her own. */}
      {pactNotice && !isCrisisState && (
        <div className="px-4 pt-3 shrink-0">
          <PactNoticeBanner notice={pactNotice} onDismiss={() => setPactNotice(null)} />
        </div>
      )}
      {!pactNotice && dependencyNudge && !isCrisisState && (
        <div className="px-4 pt-3 shrink-0">
          <DependencyNudge onDismiss={() => setDependencyNudge(false)} />
        </div>
      )}

      {/* Messages block */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 flex flex-col ${showCheckin || messages.length <= 1 ? "justify-center" : ""}`}
        id="chat-scroller"
      >

        {/* ── Opening check-in: shown as Nila's first turn when due (once per day). ──
            Gate: !hasCheckinToday(today) && getSkipFlag() !== today — same `today` for both.
            The welcome message is NOT rendered while check-in is shown; it seeds after dismiss. */}
        {showCheckin && (
          <div className="flex justify-start" id="nila-checkin-turn">
            <div className="w-full max-w-[92%]">
              <NilaCheckIn
                onLogged={handleCheckinLogged}
                onSkip={handleCheckinSkip}
              />
            </div>
          </div>
        )}

        {/* Calm presence: a single slow-breathing orb above the opening greeting — not a face/avatar
            (research: Pi/Ash use one minimal presence mark). Fades out once a real conversation starts. */}
        {!showCheckin && messages.length <= 1 && (
          <div className="flex flex-col items-center gap-3 pb-1">
            <button
              type="button"
              onClick={handleVoiceTalk}
              disabled={loading}
              aria-label={listening ? "Listening — tap when done" : "Tap to talk to Nila"}
              id="coach-voice-hero"
              className={`nila-orb w-28 h-28 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer ${listening ? "animate-pulse" : ""}`}
            >
              <NilaOrb size={112} active={listening} />
            </button>
            <div className="text-center">
              <div className="text-sm font-semibold text-slate-200">{listening ? "Listening…" : "Tap to talk to Nila"}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{listening ? "say what's on your mind" : "speak, and I'll talk back — or type instead"}</div>
            </div>
            {/* Conversation starters (mixed in) — never a blank wall; tap to send straight away. */}
            {!listening && (
              <div className="w-full max-w-[16rem] flex flex-col gap-2 mt-1">
                {["I'm overwhelmed", "I can't sleep", "Today was actually good"].map((s, i) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSendMessage(undefined, s)}
                    disabled={loading}
                    className={`text-xs py-2.5 px-4 rounded-2xl border cursor-pointer transition-colors ${i === 0 ? "bg-blue-500/10 border-blue-500/30 text-blue-100 hover:bg-blue-500/20" : "bg-card border-slate-800 text-slate-300 hover:border-slate-700"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {/* Hands-free call kept as a quiet option (the top Call button is gone). */}
            {onStartCall && !listening && (
              <button
                type="button"
                onClick={onStartCall}
                id="coach-handsfree-link"
                className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer mt-1"
              >
                <Phone className="w-3 h-3" /> or talk hands-free
              </button>
            )}
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              id={`chat-message-${idx}`}
            >
              <div
                className={`leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? "text-sm sun-cta bg-purple-600 text-white rounded-3xl rounded-br-md px-4 py-2.5 max-w-[85%] font-medium shadow-sm"
                    : "text-slate-200 max-w-[92%] pr-1 font-display text-[15px] leading-7"
                }`}
              >
                {m.content}

                {/* Offline fallback → inline navigation to the always-available tools */}
                {!isUser && m.content.includes("Your safety and grounding tools are pre-loaded") && (
                  <div className="grid grid-cols-2 gap-2 mt-4" id="coach-offline-nav">
                    <button
                      onClick={onNavigateToGrounding}
                      className="bg-page hover:bg-slate-800 text-emerald-400 text-xs font-semibold py-2.5 rounded-xl border border-slate-800 cursor-pointer transition-colors"
                    >
                      Grounding library
                    </button>
                    <button
                      onClick={onNavigateToBreathing}
                      className="bg-page hover:bg-slate-800 text-emerald-400 text-xs font-semibold py-2.5 rounded-xl border border-slate-800 cursor-pointer transition-colors"
                    >
                      Paced Breathing
                    </button>
                    <button
                      onClick={() => setIsCrisisState(true)}
                      className="col-span-2 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-450 hover:bg-rose-500/25 text-rose-450 text-rose-400 py-3 rounded-xl font-bold text-center mt-1 uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Open Safety Plan
                    </button>
                  </div>
                )}

                {!isUser && (
                  <div className="mt-2">
                    <div className="flex items-center gap-3 text-slate-500">
                      <button
                        onClick={() => speak(m.content)}
                        className="hover:text-slate-300 cursor-pointer"
                        aria-label="Read aloud"
                        title="Read aloud"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { recordFeedback(m.content, "up"); setFbGiven((p) => ({ ...p, [idx]: "up" })); setSuggestIdx((s) => (s === idx ? null : s)); }}
                        className={`cursor-pointer ${fbGiven[idx] === "up" ? "text-emerald-400" : "hover:text-slate-300"}`}
                        aria-label="This reply helped"
                        title="This helped"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { const e = recordFeedback(m.content, "down"); setFbGiven((p) => ({ ...p, [idx]: "down" })); setFbId((p) => ({ ...p, [idx]: e.id })); setSuggestIdx(idx); setSuggestDraft(""); }}
                        className={`cursor-pointer ${fbGiven[idx] === "down" ? "text-amber-400" : "hover:text-slate-300"}`}
                        aria-label="This reply missed the mark"
                        title="This missed"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      {fbGiven[idx] && <span className="text-[10px] text-slate-600">thanks — stays on your phone</span>}
                    </div>
                    {suggestIdx === idx && (
                      <div className="mt-2 space-y-1.5">
                        <textarea
                          value={suggestDraft}
                          onChange={(e) => setSuggestDraft(e.target.value)}
                          rows={2}
                          placeholder="What would've helped more? (optional — helps improve Nila, stays on your device)"
                          aria-label="Suggest a better reply"
                          className="w-full text-xs bg-card border border-slate-800 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setSuggestIdx(null); setSuggestDraft(""); }} className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 cursor-pointer">Skip</button>
                          <button onClick={() => {
                            const s = suggestDraft.trim();
                            if (fbId[idx] && s) attachSuggestion(fbId[idx], s);
                            setSuggestText((p) => ({ ...p, [idx]: s }));
                            setSuggestIdx(null);
                            setSuggestDraft("");
                            // Offer to donate this correction — unless it carries crisis content (then never ask).
                            if (s && !buildDonationPreview({ id: fbId[idx] ?? "", at: "", rating: "down", reply: m.content, suggestion: s }).blockedByCrisis) {
                              setDonateIdx(idx); setDonatePreviewOpen(false);
                            }
                          }} className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 px-2 py-1 cursor-pointer">Save</button>
                        </div>
                      </div>
                    )}
                    {donateIdx === idx && !donatedIdx[idx] && (
                      <div className="mt-2 bg-page border border-slate-800 rounded-xl p-2.5 space-y-2" id="donate-prompt">
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          <Sparkles className="w-3 h-3 inline text-violet-400 mr-1" />
                          Share this to help train Nila? <span className="text-slate-500">(optional)</span> Only <span className="font-medium text-slate-200">Nila's reply</span> and <span className="font-medium text-slate-200">your wording</span> would be shared — never your conversation or anything else in the app.
                        </p>
                        {donatePreviewOpen && (() => { const dp = buildDonationPreview(fbEntry(idx, m.content)); return (
                          <div className="space-y-1 border-t border-slate-800 pt-2">
                            <div className="text-[10px] text-slate-500">This is everything that would be shared — nothing else leaves your phone:</div>
                            <div className="text-[11px] text-slate-400"><span className="text-slate-500">Nila said: </span>"{dp.nilaReply}"</div>
                            <div className="text-[11px] text-slate-400"><span className="text-slate-500">You suggested: </span>"{dp.betterReply}"</div>
                          </div>
                        ); })()}
                        <div className="flex gap-2 justify-end">
                          {!donatePreviewOpen ? (
                            <button onClick={() => setDonatePreviewOpen(true)} className="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-1 cursor-pointer">See exactly what's shared</button>
                          ) : (
                            <button onClick={() => { confirmDonation(fbEntry(idx, m.content)); setDonatedIdx((p) => ({ ...p, [idx]: true })); setDonatePreviewOpen(false); }} className="text-[11px] font-semibold text-violet-300 hover:text-violet-200 px-2 py-1 cursor-pointer">Share this</button>
                          )}
                          <button onClick={() => { setDonateIdx(null); setDonatePreviewOpen(false); }} className="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-1 cursor-pointer">Not now</button>
                        </div>
                      </div>
                    )}
                    {donatedIdx[idx] && (
                      <div className="mt-2 flex items-center justify-between bg-page border border-emerald-500/20 rounded-xl px-2.5 py-2" id="donate-thanks">
                        <span className="text-[11px] text-emerald-300/90">Shared — thank you. This helps make Nila better for everyone.</span>
                        <button onClick={() => { revokeDonation(fbId[idx] ?? ""); setDonatedIdx((p) => ({ ...p, [idx]: false })); setDonateIdx(null); }} className="text-[10px] text-slate-500 hover:text-slate-300 px-1.5 py-0.5 cursor-pointer">Undo</button>
                      </div>
                    )}
                  </div>
                )}

                {!isUser && idx === messages.length - 1 && !isCrisisState && openerSig && !openerDone && (
                  <div className="mt-3 flex gap-2" id="inflection-affordance">
                    <button
                      onClick={() => {
                        acknowledgeInflection(openerSig.id, "fits");
                        setOpenerDone(true);
                        const follow = openerSig.direction === "deterioration"
                          ? "Thank you for telling me — that helps me be here with you properly. What's been weighing on you most?"
                          : "I'm really glad to hear that. What do you think has been helping?";
                        setMessages((prev) => [...prev, { role: "assistant", content: follow }]);
                      }}
                      className="flex-1 bg-page border border-blue-500/30 hover:border-blue-500/50 rounded-xl px-3 py-2 text-xs font-bold text-slate-100 cursor-pointer transition-colors"
                    >Yeah, kind of</button>
                    <button
                      onClick={() => {
                        acknowledgeInflection(openerSig.id, "dismissed");
                        setOpenerDone(true);
                        setMessages((prev) => [...prev, { role: "assistant", content: "All good — I'll set that aside. How are you really doing today?" }]);
                      }}
                      className="flex-1 bg-page border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 cursor-pointer transition-colors"
                    >Not really</button>
                  </div>
                )}

                {/* In-chat cards: deterministic check-in cards + the AI-named skill card.
                    Hidden entirely during crisis state — no episode/screening affordances while shield is active. */}
                {!isUser && idx === messages.length - 1 && !isCrisisState && (
                  <div className="mt-3 space-y-2">
                    {cardsForReply(m.content, null, []).map((card, ci) => (
                      <button
                        key={ci}
                        onClick={() => dispatchCard(card)}
                        id={card.kind === "skill" ? `coach-skill-${card.skillId}` : `coach-card-${card.kind}`}
                        className="w-full flex items-center gap-2.5 bg-page border border-blue-500/30 hover:border-blue-500/50 rounded-xl px-3 py-2.5 cursor-pointer transition-colors text-left"
                      >
                        <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="flex-1 min-w-0 block text-xs font-bold text-slate-100">{card.label}</span>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Orchestration cards: surfaced inline after a check-in is logged. ──
            Reuses the `coach-skill-${id}` inline-button pattern from the existing skill delivery.
            Taps dispatch to the relevant handler; episode placeholder calls onModeChange?.('episode').
            During crisis state: episode + screening cards are suppressed (tangent escape hatches);
            grounding cards are kept because grounding is itself a crisis-appropriate tool. */}
        {nilaCards.length > 0 && (
          <div className="flex justify-start" id="nila-orchestration-cards">
            <div className="w-full max-w-[92%] space-y-2">
              {nilaCards.map((card) => {
                // During crisis, skip episode and screening — they are navigation tangents.
                if (isCrisisState && (card.kind === "episode" || card.kind === "screening")) return null;
                if (card.kind === "grounding") {
                  return (
                    <button
                      key={`coach-skill-grounding`}
                      id="coach-skill-grounding"
                      onClick={onNavigateToGrounding}
                      className="w-full flex items-center gap-2.5 bg-page border border-emerald-500/30 hover:border-emerald-500/50 rounded-xl px-3 py-2.5 cursor-pointer transition-colors text-left"
                    >
                      <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-100">{card.label}</span>
                        <span className="block text-[10px] text-slate-400">Grounding exercise</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  );
                }
                if (card.kind === "episode") {
                  return (
                    <button
                      key="coach-skill-episode"
                      id="coach-skill-episode"
                      onClick={() => onModeChange("episode")}
                      className="w-full flex items-center gap-2.5 bg-page border border-rose-500/30 hover:border-rose-500/50 rounded-xl px-3 py-2.5 cursor-pointer transition-colors text-left"
                    >
                      <Brain className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-100">{card.label}</span>
                        <span className="block text-[10px] text-slate-400">Episode support mode</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  );
                }
                if (card.kind === "skill" && card.skillId) {
                  return (
                    <button
                      key={`coach-skill-${card.skillId}`}
                      id={`coach-skill-${card.skillId}`}
                      onClick={() => onOpenSkill?.(card.skillId!)}
                      className="w-full flex items-center gap-2.5 bg-page border border-blue-500/30 hover:border-blue-500/50 rounded-xl px-3 py-2.5 cursor-pointer transition-colors text-left"
                    >
                      <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-100">Practice: {card.label}</span>
                        <span className="block text-[10px] text-slate-400">Skill</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  );
                }
                if (card.kind === "screening") {
                  return (
                    <button
                      key={`coach-skill-${card.instrument ?? "screening"}`}
                      id={`coach-skill-${card.instrument ?? "screening"}`}
                      onClick={() => onAgentNavigate?.("assessment")}
                      className="w-full flex items-center gap-2.5 bg-page border border-violet-500/30 hover:border-violet-500/50 rounded-xl px-3 py-2.5 cursor-pointer transition-colors text-left"
                    >
                      <ClipboardList className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-slate-100">{card.label}</span>
                        <span className="block text-[10px] text-slate-400">{card.instrument} screening</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  );
                }
                return null;
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card border border-slate-850 rounded-2xl rounded-bl-none px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <span className="flex gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
              </span>
              <span>{thinkingNote}</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="p-3 bg-card border-t border-slate-805 border-slate-800 shrink-0">
        {isCrisisState ? (
          <div className="space-y-2">
            <div className="text-xs text-rose-400 font-semibold text-center bg-rose-500/10 border border-rose-500/20 rounded-xl py-2 flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Crisis mode shielding activated
            </div>
            <button
              onClick={() => {
                setIsCrisisState(false);
                setMessages([
                  {
                    role: "assistant",
                    content: "I'm glad you reached out. Would you like to keep talking, or use a grounding exercise?"
                  }
                ]);
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-405 hover:bg-emerald-400 text-slate-950 text-xs font-bold py-3.5 rounded-xl text-center cursor-pointer transition-colors font-extrabold"
            >
              I've reached out / I'm safer now
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {typingMode ? (
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-1.5 bg-page border border-slate-800 rounded-3xl pl-4 pr-1.5 py-1.5 focus-within:border-purple-500 transition-colors"
              >
                <input
                  type="text"
                  aria-label="Message Nila"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-sm text-slate-100 py-2 focus:outline-none placeholder-slate-650"
                  placeholder="Type to Nila…"
                  disabled={loading}
                  autoFocus
                  id="coach-chat-input"
                />
                <button
                  type="button"
                  onClick={handleMic}
                  disabled={loading}
                  aria-label="Dictate instead of typing"
                  title="Dictate"
                  id="coach-mic-btn"
                  className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center cursor-pointer transition-all ${
                    listening ? "bg-rose-600 text-white animate-pulse" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Mic className="w-5 h-5" />
                </button>
                <button
                  type="submit"
                  disabled={!inputText.trim() || loading}
                  aria-label="Send message"
                  className={`w-9 h-9 rounded-full transition-all shrink-0 flex items-center justify-center ${
                    inputText.trim() && !loading
                      ? "sun-cta bg-purple-600 hover:bg-purple-550 text-white cursor-pointer"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed"
                  }`}
                  id="coach-send-message-btn"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              // VOICE-FIRST default: a big tap-to-talk is the primary, persistent way to continue.
              <button
                type="button"
                onClick={handleVoiceTalk}
                disabled={loading}
                aria-label={listening ? "Listening — tap when done" : "Tap to talk to Nila"}
                aria-live="polite"
                id="coach-talk-primary"
                className={`w-full min-h-[52px] flex items-center justify-center gap-2.5 rounded-3xl py-3.5 text-sm font-semibold transition-colors cursor-pointer ${
                  listening
                    ? "bg-rose-600/25 border-2 border-rose-400/70 text-rose-100 animate-pulse"
                    : loading
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                      : "sun-cta bg-purple-600 hover:bg-purple-500 text-white"
                }`}
              >
                <NilaOrb size={22} active={listening} className="shrink-0" /> {listening ? "Listening…" : loading ? "Nila's thinking…" : "Tap to talk"}
              </button>
            )}
            {/* secondary controls — input mode + mute (voice-first defaults; typing always one tap away) */}
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setTypingMode((t) => !t)}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 py-2 px-2 cursor-pointer"
              >
                {typingMode ? (<><Mic className="w-3 h-3" /> talk instead</>) : (<><Keyboard className="w-3 h-3" /> type instead</>)}
              </button>
              <button
                type="button"
                onClick={toggleVoiceMode}
                aria-label={voiceMode ? "Mute Nila's voice" : "Unmute Nila's voice"}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1 py-2 px-2 cursor-pointer"
              >
                {voiceMode ? (<><Volume2 className="w-3 h-3" /> voice on</>) : (<><VolumeX className="w-3 h-3" /> muted</>)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
