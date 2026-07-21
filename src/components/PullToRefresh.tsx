import React from "react";
import { Loader2 } from "lucide-react";

interface Props {
  pullDistance: number;
  pulling: boolean;
  refreshing: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  children: React.ReactNode;
}

export default function PullToRefresh({
  pullDistance,
  pulling,
  refreshing,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  children,
}: Props) {
  return (
    <div
      className="relative overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      {(pulling || refreshing) && (
        <div
          className="flex items-center justify-center w-full transition-all"
          style={{ height: Math.max(0, pullDistance), opacity: Math.min(1, pullDistance / 60) }}
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          ) : (
            <div
              className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent"
              style={{ transform: `rotate(${pullDistance * 3}deg)` }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}
