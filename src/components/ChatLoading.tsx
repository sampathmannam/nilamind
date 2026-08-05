import { useState, useEffect } from "react";

const WAITING_TIPS = [
  "Tip: Name 5 things you can see right now — it gently anchors you while you wait.",
  "Tip: Try a slow breath in for 4, hold for 4, out for 4. The bubble matches a calm pace.",
  "Tip: If waiting feels hard, that's okay. Nila will be here when you're ready.",
  "Tip: You could notice the weight of your phone in your hand while you wait.",
  "Tip: One slow exhale. Let your shoulders drop. Nila's almost here.",
];

const PHASE1_MS = 8_000;
const PHASE2_MS = 15_000;

export default function ChatLoading({ onCancel }: { onCancel?: () => void }) {
  const [phase, setPhase] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), PHASE1_MS);
    const t2 = setTimeout(() => setPhase(2), PHASE2_MS);
    const ti = setInterval(() => setTipIndex((i) => (i + 1) % WAITING_TIPS.length), 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(ti);
    };
  }, []);

  const note = phase === 0 ? "Nila is thinking" : phase === 1 ? "Still thinking…" : "Having trouble?";

  return (
    <>
      <style>{`
        @keyframes chat-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        @keyframes chat-dot-bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
        @keyframes breathing-orb {
          0%, 100% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
        .shimmer-bar {
          background: linear-gradient(90deg,
            var(--color-purple-400, #AC8FC2) 25%,
            var(--color-purple-500, #8E72B4) 50%,
            var(--color-purple-400, #AC8FC2) 75%);
          opacity: 0.15;
          background-size: 400px 100%;
          animation: chat-shimmer 1.5s ease-in-out infinite;
          border-radius: 999px;
        }
        .typing-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--color-purple-400, #AC8FC2);
          display: inline-block;
        }
        .typing-dot:nth-child(1) { animation: chat-dot-bounce 1.4s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation: chat-dot-bounce 1.4s ease-in-out 0.2s infinite; }
        .typing-dot:nth-child(3) { animation: chat-dot-bounce 1.4s ease-in-out 0.4s infinite; }
        .breathing-orb {
          animation: breathing-orb 4s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col gap-3 w-full max-w-sm" id="chat-loading" role="status" aria-label="Loading">
        {/* Typing indicator */}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-[11px] text-ink-faint">{note}</span>
          <div className="flex gap-1 items-center">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          {phase >= 2 && onCancel && (
            <button
              onClick={onCancel}
              className="ml-auto text-[11px] text-danger/80 hover:text-rose-300 underline transition-colors cursor-pointer min-h-[44px] focus-ring"
              aria-label="Cancel and stop generating"
            >
              Tap to cancel
            </button>
          )}
        </div>
        {/* Skeleton shimmer bars */}
        <div className="flex flex-col gap-2 px-0">
          <div className="shimmer-bar h-3 w-3/4" />
          <div className="shimmer-bar h-3 w-full" />
          <div className="shimmer-bar h-3 w-5/6" />
          <div className="shimmer-bar h-3 w-2/3" />
        </div>
        {/* Breathing bubble — gives the user something to DO while waiting.
            Syncs to a 4-second cycle (in 4s, out 4s) that matches box-breathing. */}
        <div className="flex flex-col items-center gap-2 py-2">
          <div
            className="breathing-orb w-12 h-12 rounded-full bg-gradient-to-br from-accent/40 to-accent/30 border border-accent/20 flex items-center justify-center"
            aria-hidden="true"
          />
          <p className="text-base text-ink-faint leading-relaxed text-center max-w-[16rem] transition-all duration-500" key={tipIndex}>
            {WAITING_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </>
  );
}
