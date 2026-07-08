// ChatLoading — skeleton shimmer + typing indicator for when Nila is generating.
// Research: skeleton screens reduce perceived wait time (Google, 2019); typing indicators
// are a conversational UI convention (WhatsApp/Facebook/iMessage).

import React from "react";

export default function ChatLoading() {
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
        .shimmer-bar {
          background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
          background-size: 400px 100%;
          animation: chat-shimmer 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
        .typing-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #64748b;
          display: inline-block;
        }
        .typing-dot:nth-child(1) { animation: chat-dot-bounce 1.4s ease-in-out infinite; }
        .typing-dot:nth-child(2) { animation: chat-dot-bounce 1.4s ease-in-out 0.2s infinite; }
        .typing-dot:nth-child(3) { animation: chat-dot-bounce 1.4s ease-in-out 0.4s infinite; }
      `}</style>
      <div className="flex flex-col gap-3 w-full max-w-sm" id="chat-loading">
        {/* Typing indicator */}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-[11px] text-slate-500">Nila is thinking</span>
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
      </div>
    </>
  );
}
