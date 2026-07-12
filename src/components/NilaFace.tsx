// NilaFace — adaptive breathing orb. Nila's visual identity.
// State-driven: calm glow, anxious pulse, low shimmer, elevated energy, crisis alert.

import React, { useMemo, useEffect, useRef } from "react";
import type { UserState } from "../types/modes";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSensoryComfort } from "../hooks/useSensoryComfort";
import { useIsLightTheme } from "../hooks/useIsLightTheme";
import { hapticLight, hapticMedium } from "../hooks/useHaptics";
import { faceMotion } from "./nilaFaceMotion";

interface NilaFaceProps {
  state: UserState | null;
  onClick?: () => void;
  onLongPress?: () => void;
  size?: number;
  isListening?: boolean;
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
    primary: "#B5614E",   // --color-rose-500 (deeper crisis red — distinct from anxious rose-400)
    secondary: "#CE8470", // --color-rose-400
    glow: "rgba(181,97,78,0.40)",
    ring: "rgba(181,97,78,0.40)",
    core: "#DDA593",      // --color-rose-300
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

export default function NilaFace({ state, onClick, onLongPress, size = 160, isListening = false }: NilaFaceProps) {
  const palette = useMemo(() => getPalette(state), [state]);
  // Motion is state- and reduced-motion-aware: 'elevated' SLOWS the orb (settles it), and
  // prefers-reduced-motion stops all ambient motion (see nilaFaceMotion — manic-first + a11y).
  // Listening state overrides with a faster pulse (halved breathe/shimmer) so the orb signals
  // active attention.
  const prefersReduced = useReducedMotion();
  const [sensoryComfort] = useSensoryComfort();
  const reduced = prefersReduced || sensoryComfort;
  const baseMotion = useMemo(() => faceMotion(state, reduced), [state, reduced]);
  const motion = useMemo(() => {
    if (isListening && baseMotion.animate) {
      return { ...baseMotion, breatheSec: baseMotion.breatheSec / 2, shimmerSec: baseMotion.shimmerSec / 2 };
    }
    return baseMotion;
  }, [isListening, baseMotion]);
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLight = useIsLightTheme();
  // Listening state also gets a brighter glow so the user sees the orb "light up" when mic is on.
  const activePalette = isListening
    ? { ...palette, glow: palette.glow.replace("0.25", "0.45").replace("0.20", "0.45").replace("0.28", "0.50").replace("0.35", "0.55").replace("0.40", "0.60") }
    : palette;
  const bodyBackground = isLight
    ? `radial-gradient(circle at 35% 35%, ${activePalette.secondary}70, ${activePalette.primary}55 55%, ${activePalette.primary}22 100%)`
    : `radial-gradient(circle at 35% 35%, ${activePalette.secondary}10, ${activePalette.primary}20 60%, #0f172a 100%)`;
  const bodyBorder = isLight ? `1.5px solid ${activePalette.primary}66` : `1px solid ${activePalette.ring}`;
  const bodyShadow = isLight
    ? `0 6px ${size * 0.28}px ${activePalette.primary}33, inset 0 0 ${size * 0.15}px rgba(255,255,255,0.25)`
    : `0 0 ${size * 0.3}px ${activePalette.glow}, inset 0 0 ${size * 0.15}px rgba(255,255,255,0.03)`;

  // Haptic on state transition: light tap for most state changes, warning for crisis.
  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current && prevState.current !== state) {
      void (state === "crisis" ? hapticMedium() : hapticLight());
    }
    prevState.current = state;
  }, [state]);

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
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onLongPress) {
          e.preventDefault();
          onLongPress();
        }
      }}
      className="relative flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-150"
      style={{
        width: size,
        height: size,
        animation: motion.animate ? `nila-drift 8s ease-in-out infinite` : "none",
      }}
      aria-label="Talk to Nila — long press or press Enter for crisis resources"
    >
      {/* Outer glow halo — breathes */}
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${palette.glow} 0%, transparent 70%)`,
          animation: motion.animate ? `nila-breathe ${motion.breatheSec}s infinite` : "none",
        }}
      />

      {/* Orb ring — slowly rotates; when motion off, ring statically signals state */}
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
          strokeWidth={!motion.animate && state === "crisis" ? ringWidth * 2.5 : ringWidth}
          strokeDasharray={!motion.animate && state === "crisis" ? "none" : `${Math.round(size * 0.4)} ${Math.round(size * 0.6)}`}
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

        {/* Core light dot — elliptical during crisis (subtle distress signal) */}
        <div
          className="relative"
          style={{
            width: state === "crisis" ? coreR * 2.6 : coreR * 2,
            height: coreR * 2,
            borderRadius: state === "crisis" ? "50%" : "9999px",
            background: `radial-gradient(circle, ${palette.core}, ${palette.primary}80)`,
            boxShadow: `0 0 ${coreR}px ${palette.glow}`,
          }}
        />
      </div>
    </button>
  );
}
