import React from "react";

interface NilaDotProps {
  size?: number;
}

export default function NilaDot({ size = 14 }: NilaDotProps) {
  return (
    <div className="shrink-0 relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: "radial-gradient(circle at 35% 30%, #D9A6C8, #C784B0 70%)",
          boxShadow: "0 0 6px rgba(199,132,176,0.3), inset 0 1px 2px rgba(255,255,255,0.3)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: Math.round(size * 0.35),
          height: Math.round(size * 0.35),
          background: "radial-gradient(circle, #F0DCEA, #C784B0 80%)",
          top: "18%",
          left: "22%",
          filter: "blur(0.5px)",
        }}
      />
    </div>
  );
}
