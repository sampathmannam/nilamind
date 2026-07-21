
interface BreathingCircleProps {
  /** Diameter in px of the resting (exhaled) circle. */
  size?: number;
  className?: string;
  /** Optional phase label rendered for sighted users (e.g. "Breathe in"). aria-hidden by default. */
  showLabel?: boolean;
}

/**
 * Ambient breathing guide on a 4-7-8 rhythm (inhale 4s → hold 7s → exhale 8s; ~19s loop) — the
 * "box-breathing" style anchor Headspace/Finch use (UX-5 Phase 4). Pure CSS (breathe-478 keyframe);
 * under prefers-reduced-motion the circle is static and motion-free, which is exactly what a user who
 * has opted out of motion — often the anxious/overwhelmed cohort — should get. Decorative: hidden from
 * assistive tech so it never adds noise to the a11y tree.
 */
export default function BreathingCircle({ size = 160, className = "", showLabel = false }: BreathingCircleProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      aria-hidden="true"
    >
      <div
        className="breathe-478 rounded-full bg-gradient-to-br from-blue-400/20 via-indigo-400/15 to-transparent border border-blue-400/30"
        style={{ width: size, height: size }}
      />
      {showLabel && (
        <span className="text-xs text-ink-muted">Breathe in… hold… let go</span>
      )}
    </div>
  );
}
