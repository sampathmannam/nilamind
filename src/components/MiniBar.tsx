import React from "react";

interface MiniBarProps {
  data: number[];
  max?: number;
  width?: number;
  height?: number;
  barColor?: string;
  className?: string;
}

export default function MiniBar({
  data,
  max,
  width = 120,
  height = 32,
  barColor = "var(--color-accent)",
  className = "",
}: MiniBarProps) {
  if (data.length === 0) return null;

  const maxVal = max ?? Math.max(...data);
  const barWidth = Math.max(4, width / data.length - 2);

  return (
    <svg width={width} height={height} className={className} aria-hidden="true">
      {data.map((v, i) => {
        const barH = maxVal > 0 ? (v / maxVal) * height : 0;
        const x = i * (barWidth + 2);
        const y = height - barH;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barH}
            fill={barColor}
            rx={1}
            opacity={0.8}
          />
        );
      })}
    </svg>
  );
}
