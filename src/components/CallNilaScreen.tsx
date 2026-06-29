import React, { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Sparkles, LifeBuoy, Hand } from "lucide-react";
import { scanForCrisis, getCrisisReply } from "../safety";
import { crisisLinesInline } from "../services/crisisResources";
import { NilaMessage } from "../services/nila";
import { askNilaLocalStream } from "../services/localNila";
import { createStreamGuard, resolveStreamedVoiceReply } from "../services/nilaSend";
import { speak, stopSpeaking, listenForCall, stopListening, sttAvailable, createSpeechQueue } from "../services/voice";
import { logNilaTurn } from "../services/nilaSessions";
import { rememberSession } from "../services/nilaMemory";
import { useSettlingNote } from "./useSettlingNote";

// "Call Nila" — the over-phone mode (user brief: talk to Nila like calling a friend). A hands-free,
// continuous voice loop: Nila greets → listens → thinks → speaks → listens again, until you end the
// call. Turn-based (not full-duplex) so it's robust across the Web Speech API and the native plugin;
// tap the orb to interrupt Nila and talk over them. Crisis scanning runs LOCALLY before anything is
// sent, exactly as in the text chat — safety never depends on the network.

type Phase = "connecting" | "listening" | "thinking" | "speaking" | "idle" | "crisis" | "unsupported";

const GREETING = "Hey, it's Nila. I'm right here with you — no rush. What's going on?";
const OFFLINE_LINE =
  "I'm having trouble reaching the line right now — but your grounding tools always work. Tap the red button to end, and I'll be here whenever you're back.";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export default function CallNilaScreen({ onEnd }: { onEnd: () => void }) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [nilaLine, setNilaLine] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [muted, setMuted] = useState<boolean>(false);

  const active = useRef(true);
  const mutedRef = useRef(false);
  const pausedRef = useRef(false); // set after repeated silence; cleared by "tap to talk"
  const convo = useRef<NilaMessage[]>([]);
  const speakQueue = useRef<ReturnType<typeof createSpeechQueue> | null>(null);

  // End the call: stop all audio + recognition and hand control back to the parent.
  const endCall = () => {
    active.current = false;
    void stopListening();
    speakQueue.current?.cancel();
    void stopSpeaking();
    onEnd();
  };

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) void stopListening(); // abort any in-progress listen immediately
  };

  // Tap the orb while Nila is talking to interrupt; tap while paused to resume.
  const tapOrb = () => {
    if (phase === "speaking") speakQueue.current?.cancel();
    if (pausedRef.current) { pausedRef.current = false; setPhase("listening"); }
  };

  useEffect(() => {
    active.current = true;

    const run = async () => {
      const canVoice = await sttAvailable();
      if (!active.current) return;
      if (!canVoice) { setPhase("unsupported"); return; }

      // Greet first — speaking establishes Nila as present before asking anything.
      setPhase("speaking");
      setNilaLine(GREETING);
      convo.current = [{ role: "assistant", content: GREETING }];
      await speak(GREETING);

      let empties = 0;
      while (active.current) {
        if (mutedRef.current || pausedRef.current) { await delay(200); continue; }

        setPhase("listening");
        const heard = (await listenForCall()).trim();
        if (!active.current) break;
        if (mutedRef.current || pausedRef.current) continue;

        if (!heard) {
          empties += 1;
          if (empties >= 3) { pausedRef.current = true; setPhase("idle"); }
          else { await delay(300); }
          continue;
        }
        empties = 0;
        setTranscript(heard);
        logNilaTurn("coach", heard);

        // Crisis: handled locally, never sent to the model. Speak the safe reply and hold here.
        if (scanForCrisis(heard)) {
          await stopListening();
          const reply = getCrisisReply();
          setNilaLine(reply);
          setPhase("crisis");
          await speak(reply);
          break;
        }

        const next = [...convo.current, { role: "user", content: heard } as NilaMessage];
        convo.current = next;
        setPhase("thinking");

        // Stream Nila's reply and speak it sentence-by-sentence as it arrives — it starts talking
        // within ~a second instead of after the whole reply. Agentic in-call (log a mood, recall,
        // remind) but never navigates away. Falls back to a one-shot reply on non-streaming backends.
        const queue = createSpeechQueue();
        speakQueue.current = queue;
        let shown = "";
        let started = false;
        // Stream guard: suppress unsafe tokens LIVE (method + "how to") and cut speech the instant harm
        // is detected, before it is spoken. The resolver below is the broad final authority.
        const guard = createStreamGuard(
          (t) => {
            if (!active.current) return;
            shown += t;
            setNilaLine(shown);
            if (!started) { started = true; setPhase("speaking"); }
            queue.push(t);
          },
          () => queue.cancel(),
        );
        const res = await askNilaLocalStream(next, { onDelta: guard.onDelta });
        if (!active.current) { queue.cancel(); break; }

        // Final decision (fail-closed): tripped / offline / unsafe-final → speak the fallback fresh;
        // a clean reply that already streamed just finishes playing.
        const decision = resolveStreamedVoiceReply({
          reachedAI: res.reachedAI,
          reply: res.reply,
          shown,
          tripped: guard.tripped(),
          userText: heard,
          offlineLine: OFFLINE_LINE,
        });
        const line = decision.line;
        if (decision.needsFreshSpeak) {
          queue.cancel(); // idempotent; onTrip may have already cancelled
          setNilaLine(line);
          setPhase("speaking");
          await speak(line);
        } else {
          await queue.flush(); // finish speaking the streamed reply
        }
        speakQueue.current = null;
        convo.current = [...next, { role: "assistant", content: line }];
      }
    };

    void run();
    return () => {
      active.current = false;
      void stopListening();
      void stopSpeaking();
      void rememberSession(convo.current); // remember the call too (cross-session memory)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escalating reassurance while Nila generates — the first on-device reply can take minutes (the model
  // page-faults in), and a silent "Thinking…" for that long reads like a dropped call.
  const thinkingNote = useSettlingNote(phase === "thinking", "Thinking…");
  const status =
    phase === "connecting" ? "Connecting…"
    : phase === "listening" ? "Listening…"
    : phase === "thinking" ? thinkingNote
    : phase === "speaking" ? "Nila"
    : phase === "idle" ? "Paused"
    : phase === "crisis" ? "You matter"
    : "Voice unavailable";

  const listening = phase === "listening";
  const speaking = phase === "speaking";

  return (
    <div className="fixed inset-0 z-50 bg-page flex flex-col" id="call-nila-screen" role="dialog" aria-label="Call with Nila">
      {/* top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-2 shrink-0">
        <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">Call with Nila</div>
        <button
          onClick={() => { /* surface crisis lines inline below; also stop audio */ void stopSpeaking(); void stopListening(); pausedRef.current = true; setPhase("crisis"); setNilaLine(getCrisisReply()); }}
          aria-label="Get crisis support now"
          className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-[11px] font-semibold cursor-pointer"
        >
          <LifeBuoy className="w-4 h-4" /> Support
        </button>
      </div>

      {/* center: orb + status + captions */}
      <div className="flex-1 flex flex-col items-center justify-center px-7 gap-7 min-h-0">
        <button
          onClick={tapOrb}
          aria-label={speaking ? "Tap to interrupt" : phase === "idle" ? "Tap to talk" : "Nila"}
          className="relative flex items-center justify-center cursor-pointer focus:outline-none"
        >
          {/* listening ripples */}
          {listening && (
            <>
              <span className="absolute w-44 h-44 rounded-full bg-blue-500/10 animate-ping" />
              <span className="absolute w-36 h-36 rounded-full bg-blue-500/10" />
            </>
          )}
          <span
            className={`nila-orb relative w-32 h-32 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center transition-transform duration-500 ${
              speaking ? "scale-110" : listening ? "scale-105" : "scale-100"
            } ${phase === "thinking" ? "animate-pulse" : ""}`}
          >
            <Sparkles className="w-12 h-12 text-blue-200" />
          </span>
        </button>

        <div className="text-center space-y-3 max-w-sm">
          <p className="text-sm font-semibold text-slate-300" role="status" aria-live="polite">{status}</p>

          {phase === "crisis" ? (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-2">
              <p className="text-sm text-slate-100 leading-relaxed">{nilaLine}</p>
              <p className="text-xs text-rose-300 font-semibold leading-relaxed">{crisisLinesInline()}</p>
            </div>
          ) : phase === "unsupported" ? (
            <p className="text-sm text-slate-400 leading-relaxed">
              Voice calling isn't available on this device. You can still talk with Nila by text — tap below to go back.
            </p>
          ) : (
            <>
              {nilaLine && <p className="text-base text-slate-100 leading-relaxed">{nilaLine}</p>}
              {transcript && (
                <p className="text-xs text-slate-500 italic leading-relaxed">“{transcript}”</p>
              )}
            </>
          )}

          {phase === "idle" && (
            <button
              onClick={() => { pausedRef.current = false; setPhase("listening"); }}
              className="inline-flex items-center gap-2 bg-blue-500/15 border border-blue-500/40 text-blue-200 text-sm font-semibold px-5 py-2.5 rounded-full cursor-pointer"
            >
              <Hand className="w-4 h-4" /> Tap to talk
            </button>
          )}
        </div>
      </div>

      {/* honest framing — quiet, always present */}
      <p className="text-center text-[10px] text-slate-600 font-mono uppercase tracking-wider px-6 shrink-0">
        An AI companion, not a therapist
      </p>

      {/* controls */}
      <div className="flex items-center justify-center gap-8 px-6 pt-4 pb-10 shrink-0">
        {phase !== "unsupported" && phase !== "crisis" && (
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            aria-pressed={muted}
            className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              muted ? "bg-slate-700 text-slate-200" : "bg-card border border-slate-700 text-slate-300 hover:text-slate-100"
            }`}
          >
            {muted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
        )}
        <button
          onClick={endCall}
          aria-label="End call"
          id="call-end-btn"
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center cursor-pointer shadow-lg transition-colors"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
}
