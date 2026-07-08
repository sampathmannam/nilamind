// NilaFace — adaptive breathing orb. Nila's visual identity.
// State-driven: calm glow, anxious pulse, low shimmer, elevated energy, crisis alert.

import React, { useMemo } from "react";
import type { UserState } from "../types/modes";

interface NilaFaceProps {
  state: UserState | null;
  onClick?: () => void;
  onLongPress?: () => void;
  size?: number;
}

interface OrbPalette {
  primary: string;
  secondary: string;
  glow: string;
  ring: string;
  core: string;
}

const PALETTES: Record<string, OrbPalette> = {
  calm: {
    primary: "#818cf8",   // indigo-400
    secondary: "#a78bfa", // violet-400
    glow: "rgba(129,140,248,0.25)",
    ring: "rgba(129,140,248,0.15)",
    core: "#c4b5fd",      // violet-300
  },
  anxious: {
    primary: "#60a5fa",   // blue-400
    secondary: "#38bdf8", // sky-400
    glow: "rgba(96,165,250,0.25)",
    ring: "rgba(96,165,250,0.15)",
    core: "#bae6fd",      // sky-200
  },
  low: {
    primary: "#c084fc",   // purple-400
    secondary: "#e879f9", // fuchsia-400
    glow: "rgba(192,132,252,0.20)",
    ring: "rgba(192,132,252,0.12)",
    core: "#e9d5ff",      // purple-200
  },
  elevated: {
    primary: "#fbbf24",   // amber-400
    secondary: "#f97316", // orange-500
    glow: "rgba(251,191,36,0.28)",
    ring: "rgba(251,191,36,0.18)",
    core: "#fde68a",      // amber-200
  },
  crisis: {
    primary: "#f87171",   // red-400
    secondary: "#fb7185", // rose-400
    glow: "rgba(248,113,113,0.35)",
    ring: "rgba(248,113,113,0.20)",
    core: "#fecaca",      // red-200
  },
};

function getPalette(state: UserState | null): OrbPalette {
  switch (state) {
    case "calm": return PALETTES.calm;
    case "anxious": return PALETTES.anxious;
    case "low": return PALETTES.low;
    case "elevated": return PALETTES.elevated;
    case "crisis": return PALETTES.crisis;
    default: return PALETTES.calm;
  }
}

export default function NilaFace({ state, onClick, onLongPress, size = 160 }: NilaFaceProps) {
  const palette = useMemo(() => getPalette(state), [state]);
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    holdTimer.current = setTimeout(() => onLongPress?.(), 500);
  };
  const handleTouchEnd = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  };

  const inner = Math.round(size * 0.55);
  const coreR = Math.round(size * 0.08);
  const ringWidth = Math.round(size * 0.015);

  return (
    <button
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-150"
      style={{ width: size, height: size }}
      aria-label="Talk to Nila"
    >
      <style>{`
        @keyframes nila-breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes nila-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes nila-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Outer glow halo — breathes */}
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
          animation: "nila-breathe 3s ease-in-out infinite",
        }}
      />

      {/* Orb ring — slowly rotates */}
      <svg
        className="absolute"
        width={size + ringWidth * 2}
        height={size + ringWidth * 2}
        viewBox={`0 0 ${size + ringWidth * 2} ${size + ringWidth * 2}`}
        style={{ animation: "nila-spin-slow 20s linear infinite" }}
        aria-hidden="true"
      >
        <circle
          cx={(size + ringWidth * 2) / 2}
          cy={(size + ringWidth * 2) / 2}
          r={size / 2 - ringWidth}
          fill="none"
          stroke={palette.ring}
          strokeWidth={ringWidth}
          strokeDasharray={`${Math.round(size * 0.4)} ${Math.round(size * 0.6)}`}
          strokeLinecap="round"
        />
      </svg>

      {/* Main orb body */}
      <div
        className="rounded-full flex items-center justify-center relative overflow-hidden"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 35%, ${palette.secondary}10, ${palette.primary}20 60%, #0f172a 100%)`,
          border: `1px solid ${palette.ring}`,
          boxShadow: `0 0 ${size * 0.3}px ${palette.glow}, inset 0 0 ${size * 0.15}px rgba(255,255,255,0.03)`,
        }}
      >
        {/* Inner gradient sphere */}
        <div
          className="rounded-full absolute"
          style={{
            width: inner,
            height: inner,
            background: `radial-gradient(circle at 40% 40%, ${palette.core}60, ${palette.primary}30 80%, transparent)`,
            filter: "blur(2px)",
          }}
        />

        {/* Shimmer sweep across top */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(135deg, transparent 40%, ${palette.glow} 50%, transparent 60%)`,
            backgroundSize: "200% 200%",
            animation: "nila-shimmer 6s ease-in-out infinite",
            opacity: 0.4,
          }}
        />

        {/* Core light dot */}
        <div
          className="rounded-full relative"
          style={{
            width: coreR * 2,
            height: coreR * 2,
            background: `radial-gradient(circle, ${palette.core}, ${palette.primary}80)`,
            boxShadow: `0 0 ${coreR}px ${palette.glow}`,
          }}
        />
      </div>
    </button>
  );
}
