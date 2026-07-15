// ChatLoading — skeleton shimmer + typing indicator + breathing bubble for when Nila is generating.
// Research: skeleton screens reduce perceived wait time (Google, 2019); typing indicators
// are a conversational UI convention (WhatsApp/Facebook/iMessage). The breathing bubble gives
// the user something to DO while waiting — sync their breath to the expanding/contracting orb.
// The copy escalates with wait time (useSettlingNote) so a long cold-load never reads as broken.

import React, { useState, useEffect } from "react";
import { useSettlingNote } from "./useSettlingNote";

const WAITING_TIPS = [
  "Tip: Name 5 things you can see right now — it gently anchors you while you wait.",
  "Tip: Try a slow breath in for 4, hold for 4, out for 4. The bubble matches a calm pace.",
  "Tip: If waiting feels hard, that's okay. Nila will be here when you're ready.",
  "Tip: You could notice the weight of your phone in your hand while you wait.",
  "Tip: One slow exhale. Let your shoulders drop. Nila's almost here.",
];

export default function ChatLoading() {
  const note = useSettlingNote(true, "Nila is thinking");
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % WAITING_TIPS.length), 6000);
    return () => clearInterval(id);
  }, []);

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
            rgba(236,91,158,0.13) 25%,
            rgba(236,91,158,0.28) 50%,
            rgba(236,91,158,0.13) 75%);
          background-size: 400px 100%;
          animation: chat-shimmer 1.5s ease-in-out infinite;
          border-radius: 999px;
        }
        .typing-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #EC5B9E;
          display: inline-block;
        }
        .typing-dot:nth-child(1) { animation: chat-dot-bounce 1.4s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation: chat-dot-bounce 1.4s ease-in-out 0.2s infinite; }
        .typing-dot:nth-child(3) { animation: chat-dot-bounce 1.4s ease-in-out 0.4s infinite; }
        .breathing-orb {
          animation: breathing-orb 4s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col gap-3 w-full max-w-sm" id="chat-loading">
        {/* Typing indicator */}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-[11px] text-slate-500">{note}</span>
          <div className="flex gap-1 items-center">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
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
            className="breathing-orb w-12 h-12 rounded-full bg-gradient-to-br from-purple-400/40 to-purple-600/30 border border-purple-400/20 flex items-center justify-center"
            aria-hidden="true"
          />
          <p className="text-[10px] text-slate-500 leading-relaxed text-center max-w-[16rem] transition-all duration-500" key={tipIndex}>
            {WAITING_TIPS[tipIndex]}
          </p>
        </div>
      </div>
    </>
  );
}
