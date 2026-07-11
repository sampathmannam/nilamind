// NilaFace — adaptive breathing orb. Nila's visual identity.
// State-driven: calm glow, anxious pulse, low shimmer, elevated energy, crisis alert.

import React, { useMemo, useState, useEffect } from "react";
import type { UserState } from "../types/modes";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { faceMotion } from "./nilaFaceMotion";

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

// Custom-theme palette — uses the app's warm lavender/terracotta/honey colors (defined in index.css
// as --color-blue-*, --color-rose-*, --color-amber-*) instead of Tailwind-default indigo/blue/red.
// These match the custom theme and respond correctly on both dark and light backgrounds.
const PALETTES: Record<string, OrbPalette> = {
  calm: {
    primary: "#BEA4D0",   // --color-blue-400 (warm lavender)
    secondary: "#D1BFDF", // --color-purple-300 
    glow: "rgba(190,164,208,0.25)",
    ring: "rgba(190,164,208,0.15)",
    core: "#E2D6EC",      // --color-blue-200
  },
  anxious: {
    primary: "#CE8470",   // --color-rose-400 (terracotta)
    secondary: "#DDA593", // --color-rose-300
    glow: "rgba(206,132,112,0.25)",
    ring: "rgba(206,132,112,0.15)",
    core: "#ECC2B6",      // --color-rose-200
  },
  low: {
    primary: "#BEA4D0",   // --color-purple-400 (warm lavender)
    secondary: "#D1BFDF", // --color-purple-300
    glow: "rgba(190,164,208,0.20)",
    ring: "rgba(190,164,208,0.12)",
    core: "#E2D6EC",      // --color-purple-200
  },
  elevated: {
    primary: "#DDB463",   // --color-amber-400 (warm honey)
    secondary: "#E8C98C", // --color-amber-300
    glow: "rgba(221,180,99,0.28)",
    ring: "rgba(221,180,99,0.18)",
    core: "#ECCF94",      // --color-amber-200
  },
  crisis: {
    primary: "#CE8470",   // --color-rose-400 (terracotta crisis)
    secondary: "#DDA593", // --color-rose-300
    glow: "rgba(206,132,112,0.35)",
    ring: "rgba(206,132,112,0.20)",
    core: "#ECC2B6",      // --color-rose-200
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
  // Motion is state- and reduced-motion-aware: 'elevated' SLOWS the orb (settles it), and
  // prefers-reduced-motion stops all ambient motion (see nilaFaceMotion — manic-first + a11y).
  const prefersReduced = useReducedMotion();
  const motion = useMemo(() => faceMotion(state, prefersReduced), [state, prefersReduced]);
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // The orb's palette is tuned for a DARK background (low-opacity glows, a #0f172a fade-to-dark edge). On the
  // light/cream theme those wash out to near-invisibility, so on light we give the body a more opaque colored
  // gradient (no dark edge) and a stronger ring/shadow so the app's centrepiece actually reads. (audit: orb.)
  // Reactive theme detection — watches <html class="theme-light"> via MutationObserver so the orb
  // palette adapts immediately when the user switches themes (rather than one stale read at mount).
  const [isLight, setIsLight] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("theme-light")
  );
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsLight(el.classList.contains("theme-light"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const bodyBackground = isLight
    ? `radial-gradient(circle at 35% 35%, ${palette.secondary}70, ${palette.primary}55 55%, ${palette.primary}22 100%)`
    : `radial-gradient(circle at 35% 35%, ${palette.secondary}10, ${palette.primary}20 60%, #0f172a 100%)`;
  const bodyBorder = isLight ? `1.5px solid ${palette.primary}66` : `1px solid ${palette.ring}`;
  const bodyShadow = isLight
    ? `0 6px ${size * 0.28}px ${palette.primary}33, inset 0 0 ${size * 0.15}px rgba(255,255,255,0.25)`
    : `0 0 ${size * 0.3}px ${palette.glow}, inset 0 0 ${size * 0.15}px rgba(255,255,255,0.03)`;

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
          animation: motion.animate ? `nila-breathe ${motion.breatheSec}s ease-in-out infinite` : "none",
        }}
      />

      {/* Orb ring — slowly rotates */}
      <svg
        className="absolute"
        width={size + ringWidth * 2}
        height={size + ringWidth * 2}
        viewBox={`0 0 ${size + ringWidth * 2} ${size + ringWidth * 2}`}
        style={{ animation: motion.animate ? `nila-spin-slow ${motion.spinSec}s linear infinite` : "none" }}
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
          background: bodyBackground,
          border: bodyBorder,
          boxShadow: bodyShadow,
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
            animation: motion.animate ? `nila-shimmer ${motion.shimmerSec}s ease-in-out infinite` : "none",
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
