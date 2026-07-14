import React from "react";

export type NilaState = "calm" | "supporting" | "celebrating" | "resting" | "crisis" | "greeting";

interface Props {
  /** The emotional state of the character. */
  state?: NilaState;
  /** Size in pixels. Default 80. */
  size?: number;
  /** Additional CSS classes. */
  className?: string;
  /** Accessible label. */
  ariaLabel?: string;
}

const STATE_COLORS: Record<NilaState, { core: string; glow: string; ring: string; pulse: string }> = {
  calm: {
    core: "#7C6B9E",
    glow: "rgba(124,107,158,0.25)",
    ring: "rgba(124,107,158,0.4)",
    pulse: "rgba(124,107,158,0.15)",
  },
  supporting: {
    core: "#6B8FA3",
    glow: "rgba(107,143,163,0.25)",
    ring: "rgba(107,143,163,0.4)",
    pulse: "rgba(107,143,163,0.15)",
  },
  celebrating: {
    core: "#D4A36B",
    glow: "rgba(212,163,107,0.3)",
    ring: "rgba(212,163,107,0.5)",
    pulse: "rgba(212,163,107,0.2)",
  },
  resting: {
    core: "#5A6B7C",
    glow: "rgba(90,107,124,0.2)",
    ring: "rgba(90,107,124,0.3)",
    pulse: "rgba(90,107,124,0.1)",
  },
  crisis: {
    core: "#A36B6B",
    glow: "rgba(163,107,107,0.2)",
    ring: "rgba(163,107,107,0.35)",
    pulse: "rgba(163,107,107,0.1)",
  },
  greeting: {
    core: "#8B7BA3",
    glow: "rgba(139,123,163,0.3)",
    ring: "rgba(139,123,163,0.45)",
    pulse: "rgba(139,123,163,0.2)",
  },
};

/**
 * NilaCharacter — an abstract, warm, glowing orb that represents Nila.
 * Not a cartoon mascot — a soft, luminous presence that adapts to emotional states.
 * Think Headspace's abstract buddies, but as a gentle orb of light.
 *
 * SVG-based for crisp rendering at any size. Under 3KB.
 */
export default function NilaCharacter({
  state = "calm",
  size = 80,
  className = "",
  ariaLabel = "Nila — your wellness companion",
}: Props) {
  const colors = STATE_COLORS[state];
  const cx = 50;
  const cy = 50;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {/* Core gradient — warm, luminous center */}
        <radialGradient id={`nila-core-${state}`} cx="45%" cy="40%" r="50%">
          <stop offset="0%" stopColor={colors.core} stopOpacity="0.9" />
          <stop offset="60%" stopColor={colors.core} stopOpacity="0.6" />
          <stop offset="100%" stopColor={colors.core} stopOpacity="0.3" />
        </radialGradient>

        {/* Glow gradient — soft outer halo */}
        <radialGradient id={`nila-glow-${state}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.glow} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>

        {/* Pulse animation */}
        <radialGradient id={`nila-pulse-${state}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.pulse} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Outer pulse ring — slow breathing animation */}
      <circle
        cx={cx}
        cy={cy}
        r={42}
        fill="none"
        stroke={colors.pulse}
        strokeWidth={1}
        className="nila-orb"
        style={{ transformOrigin: "center" }}
      />

      {/* Outer glow */}
      <circle
        cx={cx}
        cy={cy}
        r={38}
        fill={`url(#nila-glow-${state})`}
      />

      {/* Main orb body */}
      <circle
        cx={cx}
        cy={cy}
        r={28}
        fill={`url(#nila-core-${state})`}
        stroke={colors.ring}
        strokeWidth={1.5}
      />

      {/* Inner highlight — gives depth */}
      <ellipse
        cx={cx - 6}
        cy={cy - 8}
        rx={10}
        ry={8}
        fill="white"
        opacity={0.12}
      />

      {/* Core dot — the "eye" / center of presence */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={colors.core}
        opacity={0.8}
      />

      {/* Small sparkle for celebrating state */}
      {state === "celebrating" && (
        <>
          <circle cx={cx + 18} cy={cy - 18} r={2} fill={colors.core} opacity={0.6}>
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx - 15} cy={cy - 20} r={1.5} fill={colors.core} opacity={0.5}>
            <animate attributeName="opacity" values="0.5;0.9;0.5" dur="1.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + 12} cy={cy + 16} r={1.5} fill={colors.core} opacity={0.4}>
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="0.8s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Steady ring for crisis state — grounding, stable */}
      {state === "crisis" && (
        <circle
          cx={cx}
          cy={cy}
          r={32}
          fill="none"
          stroke={colors.ring}
          strokeWidth={0.8}
          strokeDasharray="4 2"
        />
      )}

      {/* Z's for resting state */}
      {state === "resting" && (
        <text
          x={cx + 22}
          y={cy - 20}
          fontSize={10}
          fill={colors.core}
          opacity={0.5}
          fontFamily="var(--font-sans)"
        >
          z
        </text>
      )}

      {/* Wave for greeting state */}
      {state === "greeting" && (
        <path
          d={`M${cx - 15} ${cy + 20} Q${cx - 8} ${cy + 14} ${cx} ${cy + 20} Q${cx + 8} ${cy + 26} ${cx + 15} ${cy + 20}`}
          fill="none"
          stroke={colors.core}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.4}
        />
      )}
    </svg>
  );
}
