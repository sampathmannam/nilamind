// ProgressRing — a circular SVG progress indicator (0–100%).
// Used for adherence, completion, or any single-percentage metric.
// Pure SVG, no Recharts dependency.

interface ProgressRingProps {
  /** Percentage value 0–100. */
  value: number;
  /** Label shown below the ring. */
  label: string;
  /** Show percentage text inside the ring. */
  showPercent?: boolean;
  /** Ring diameter in px (default 64). */
  size?: number;
  className?: string;
}

export default function ProgressRing({
  value,
  label,
  showPercent = false,
  size = 64,
  className = "",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(value, 100));
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className={`flex flex-col items-center gap-1 ${className}`}
      aria-label={`${label}: ${clamped}%`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-accent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
        {showPercent && (
          <text
            x={size / 2}
            y={size / 2}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-ink text-xs font-bold"
          >
            {clamped}%
          </text>
        )}
      </svg>
      <span className="text-xs text-ink-muted text-center leading-tight">{label}</span>
    </div>
  );
}
