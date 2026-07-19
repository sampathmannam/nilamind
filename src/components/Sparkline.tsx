import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** Fixed scale floor. Defaults to data min when omitted. */
  min?: number;
  /** Fixed scale ceiling. Defaults to data max when omitted. */
  max?: number;
  className?: string;
}

export default function Sparkline({
  data,
  width = 120,
  height = 24,
  color = "var(--color-blue-400)",
  min,
  max,
  className = "",
}: SparklineProps) {
  if (data.length < 2) return null;

  const lo = min ?? Math.min(...data);
  const hi = max ?? Math.max(...data);
  const range = hi - lo || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - lo) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className={`opacity-70 ${className}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
