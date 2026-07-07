// NilaFace — the adaptive orb that changes based on user state.
// Visual feedback: calm, anxious, low, elevated, crisis.

import React from "react";
import type { UserState } from "../types/modes";

interface NilaFaceProps {
  state: UserState | null;
  onClick?: () => void;
  onLongPress?: () => void;
  size?: number;
}

const STATE_STYLES: Record<string, { glow: string; bg: string; label: string }> = {
  warm: {
    glow: "shadow-amber-400/30",
    bg: "from-amber-400/20 to-orange-400/20",
    label: "",
  },
  blue: {
    glow: "shadow-blue-400/30",
    bg: "from-blue-400/20 to-cyan-400/20",
    label: "breathing with you",
  },
  purple: {
    glow: "shadow-purple-400/30",
    bg: "from-purple-400/20 to-pink-400/20",
    label: "here for you",
  },
  green: {
    glow: "shadow-emerald-400/30",
    bg: "from-emerald-400/20 to-teal-400/20",
    label: "let's ground",
  },
  red: {
    glow: "shadow-rose-400/40",
    bg: "from-rose-400/30 to-red-400/30",
    label: "need help?",
  },
};

function getStateStyle(state: UserState | null) {
  switch (state) {
    case "calm": return STATE_STYLES.warm;
    case "anxious": return STATE_STYLES.blue;
    case "low": return STATE_STYLES.purple;
    case "elevated": return STATE_STYLES.green;
    case "crisis": return STATE_STYLES.red;
    default: return STATE_STYLES.warm;
  }
}

export default function NilaFace({ state, onClick, onLongPress, size = 120 }: NilaFaceProps) {
  const style = getStateStyle(state);
  const holdTimer = React.useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    holdTimer.current = setTimeout(() => {
      onLongPress?.();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  return (
    <button
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${style.glow} animate-pulse`}
      style={{ width: size, height: size }}
      aria-label="Talk to Nila"
    >
      {/* Outer glow ring */}
      <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${style.bg} blur-xl`} />

      {/* Main orb */}
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-slate-700/80 to-slate-900/80 backdrop-blur-sm border border-slate-600/30 flex items-center justify-center">
        {/* Inner glow */}
        <div className={`absolute inset-2 rounded-full bg-gradient-to-br ${style.bg} opacity-50`} />

        {/* Center dot */}
        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${style.bg}`} />
      </div>

      {/* State indicator */}
      {style.label && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/50 text-[10px] text-slate-300 whitespace-nowrap">
          {style.label}
        </div>
      )}
    </button>
  );
}
