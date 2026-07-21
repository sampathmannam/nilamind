
// Pure presentational SVG ring, extracted from BreathingTimer.tsx's original ring shell (2026-07-12
// Wave 3, Group E). No timing/state of its own — the caller drives `progress`. This lets the same
// visual serve BreathingTimer's cyclic phase ring and TIPP's fixed-duration Temperature/Intense-
// exercise countdowns (which additionally pass `durationMs` to render a remaining-time caption).
const CIRCLE_R = 80;
const CIRCLE_C = 100;
const STROKE_W = 6;

export interface CountdownRingProps {
  /** 0–1 fraction of the ring to fill. */
  progress: number;
  /** Primary label rendered under the ring (a breath-phase name, or a static description). */
  label: string;
  /** Stroke color for the filled arc; also colors the label text. */
  color: string;
  /** Accessible name for the ring's svg (role="img"). */
  ariaLabel: string;
  /** Optional total duration in ms — when given, shows a "Ns remaining" caption under the label. */
  durationMs?: number;
  /** Rendered square size in px. Defaults to the original BreathingTimer ring size (w-48 h-48 = 192px). */
  size?: number;
}

export default function CountdownRing({ progress, label, color, ariaLabel, durationMs, size = 192 }: CountdownRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const remainingSeconds =
    durationMs !== undefined ? Math.max(0, Math.ceil((durationMs - clamped * durationMs) / 1000)) : null;

  return (
    <div className="flex flex-col items-center gap-3" id="countdown-ring">
      <svg
        viewBox={`0 0 ${CIRCLE_C * 2} ${CIRCLE_C * 2}`}
        className="-rotate-90"
        style={{ width: size, height: size }}
        aria-label={ariaLabel}
        role="img"
      >
        <circle cx={CIRCLE_C} cy={CIRCLE_C} r={CIRCLE_R} fill="none" stroke="#1E293B" strokeWidth={STROKE_W} />
        <circle
          cx={CIRCLE_C}
          cy={CIRCLE_C}
          r={CIRCLE_R}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_W}
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * CIRCLE_R}`}
          strokeDashoffset={`${2 * Math.PI * CIRCLE_R * (1 - clamped)}`}
          style={{ transition: "stroke 0.4s ease" }}
        />
      </svg>

      <div className="text-center space-y-1">
        <p className="text-lg font-bold text-ink" style={{ color }}>
          {label}
        </p>
        {remainingSeconds !== null && (
          <p className="text-[11px] text-ink-muted" id="countdown-ring-remaining">
            {remainingSeconds}s remaining
          </p>
        )}
      </div>
    </div>
  );
}
