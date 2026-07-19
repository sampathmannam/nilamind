// NilaFace — adaptive breathing orb. Nila's visual identity.
// State-driven: calm glow, anxious pulse, low shimmer, elevated energy, crisis alert.

import React, { useMemo, useEffect, useRef, useState } from "react";
import type { UserState } from "../types/modes";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { useSensoryComfort } from "../hooks/useSensoryComfort";
import { useIsLightTheme } from "../hooks/useIsLightTheme";
import { hapticLight, hapticMedium } from "../hooks/useHaptics";
import { faceMotion } from "./nilaFaceMotion";
import { resolveAccentRender, type AffectAccentInput } from "./nilaFaceAccent";

interface NilaFaceProps {
  state: UserState | null;
  onClick?: () => void;
  onLongPress?: () => void;
  size?: number;
  isListening?: boolean;
  affectAccent?: AffectAccentInput | null;
}

interface OrbPalette {
  primary: string;
  secondary: string;
  glow: string;
  ring: string;
  core: string;
}

// Orb identity — MAGENTA PINK (user pick, 2026-07-15; the app-icon color, matching NilaOrb.tsx). One
// hue across the non-crisis states, which differ by BRIGHTNESS/saturation rather than clashing hues,
// so the orb reads as one consistent identity: calm = base pink-magenta, anxious = grounded deeper
// magenta, low = soft light pink, elevated = brighter magenta. Crisis stays a distinct red — it's a
// safety signal and must not blend into the identity hue. The light/cream-theme render (below) is
// kept vivid/luminous (not the old washed-out low-alpha tint).
const PALETTES: Record<string, OrbPalette> = {
  // 2026-07-18 design review: softened from hot pink-magenta to mauve-lavender so Nila's presence sits
  // inside the app's warm-lavender/peach palette (the calm redesign's stated "soft lavender, no more bright
  // coral→magenta" direction) instead of clashing. Still pink-leaning — she stays recognizably "her" — just
  // lower-saturation and calmer. The 5 affective states are preserved via lightness/depth, not saturation.
  calm: {
    primary: "#C784B0",   // soft mauve-pink (resting identity; matches NilaOrb.tsx)
    secondary: "#D9A6C8", // lighter mauve (specular / upper glow)
    glow: "rgba(199,132,176,0.24)",
    ring: "rgba(199,132,176,0.15)",
    core: "#F0DCEA",      // near-white mauve highlight (bright core)
  },
  anxious: {
    primary: "#B06AA0",   // grounded deeper mauve ("I'm here with you")
    secondary: "#CB95BE",
    glow: "rgba(176,106,160,0.24)",
    ring: "rgba(176,106,160,0.15)",
    core: "#E6CDDF",
  },
  low: {
    primary: "#D6AECB",   // soft, light lavender-pink (gentle)
    secondary: "#E6CCDD",
    glow: "rgba(214,174,203,0.18)",
    ring: "rgba(214,174,203,0.11)",
    core: "#F3E5EE",
  },
  elevated: {
    primary: "#C77FB4",   // a touch brighter mauve — settles an activated state, no longer hot magenta
    secondary: "#DBA3CC",
    glow: "rgba(199,127,180,0.24)",
    ring: "rgba(199,127,180,0.16)",
    core: "#F1D8EA",
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

export default function NilaFace({ state, onClick, onLongPress, size = 160, isListening = false, affectAccent = null }: NilaFaceProps) {
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
  // Per-turn affect accent — see nilaFaceAccent.ts for the dead-zone/cooldown/elevated-crisis-dormancy/
  // anxious-damping logic. `reduced` (prefers-reduced-motion OR sensory-comfort) suppresses this the
  // same way it suppresses ambient motion above.
  const lastAccentAtRef = useRef<number | null>(null);
  const accentKeyRef = useRef(0);
  const [activeAccent, setActiveAccent] = useState<{ tint: "warm" | "deep"; magnitude: number; key: number } | null>(null);

  useEffect(() => {
    if (reduced) return;
    const decision = resolveAccentRender(affectAccent, state, lastAccentAtRef.current, Date.now());
    if (!decision.render || !decision.tint) return;
    lastAccentAtRef.current = Date.now();
    accentKeyRef.current += 1;
    setActiveAccent({ tint: decision.tint, magnitude: decision.magnitude, key: accentKeyRef.current });
  }, [affectAccent, state, reduced]);

  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLight = useIsLightTheme();
  // Listening state also gets a brighter glow so the user sees the orb "light up" when mic is on.
  const activePalette = isListening
    ? { ...palette, glow: palette.glow.replace("0.25", "0.45").replace("0.20", "0.45").replace("0.28", "0.50").replace("0.35", "0.55").replace("0.40", "0.60") }
    : palette;
  // Light/cream theme previously rendered the orb with very low alphas (…55/…22 fill, …66 border,
  // …33 shadow), so it faded to a faint washed-out tint on the cream background (device feedback
  // 2026-07-15). Render it as a solid, luminous, saturated sphere instead — same identity hues, far
  // more presence: near-opaque radial fill, a soft specular top-left, a solid rim, and a warm glow.
  const bodyBackground = isLight
    ? `radial-gradient(circle at 34% 30%, #ffffffcc 0%, ${activePalette.secondary} 26%, ${activePalette.primary} 68%, ${activePalette.primary}dd 100%)`
    : `radial-gradient(circle at 35% 35%, ${activePalette.secondary}10, ${activePalette.primary}20 60%, #0f172a 100%)`;
  const bodyBorder = isLight ? `1.5px solid ${activePalette.primary}` : `1px solid ${activePalette.ring}`;
  const bodyShadow = isLight
    ? `0 8px ${size * 0.36}px ${activePalette.primary}66, inset 0 ${size * 0.06}px ${size * 0.14}px rgba(255,255,255,0.45), inset 0 -${size * 0.05}px ${size * 0.12}px ${activePalette.primary}55`
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

        {/* Per-turn affect accent — brief core-dot flicker, independent of the crisis ellipse above. */}
        {activeAccent && (
          <div
            key={activeAccent.key}
            className="absolute rounded-full pointer-events-none"
            onAnimationEnd={() => setActiveAccent(null)}
            style={{
              width: coreR * 2,
              height: coreR * 2,
              top: "50%",
              left: "50%",
              background: activeAccent.tint === "warm"
                ? "radial-gradient(circle, #FDEFDC, transparent 70%)"
                : "radial-gradient(circle, #B06AA0, transparent 70%)",
              boxShadow: activeAccent.tint === "warm"
                ? `0 0 ${coreR}px rgba(247,201,138,0.9)`
                : `0 0 ${coreR}px rgba(176,106,160,0.85)`,
              ["--nila-accent-scale" as string]: 1 + 0.6 * activeAccent.magnitude,
              animation: "nila-accent-flicker 1.4s ease-out 1",
            }}
          />
        )}
      </div>
    </button>
  );
}
