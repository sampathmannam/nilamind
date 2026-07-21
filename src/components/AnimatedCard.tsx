import React from "react";

interface AnimatedCardProps {
  children: React.ReactNode;
  /** Stagger delay in ms — pass the card's index × step to cascade entrances. */
  delayMs?: number;
  className?: string;
  id?: string;
}

/**
 * Wraps content in a gentle fade-up entrance (UX-5 Phase 1: "card enter — fade-up, staggered").
 * Pure presentational wrapper: the animation is CSS (animate-fade-up) and is disabled entirely under
 * prefers-reduced-motion via the media query in index.css, so this is safe for distressed users who
 * opt out of motion. No library dependency — keeps the bundle small and the behavior deterministic.
 */
export default function AnimatedCard({ children, delayMs = 0, className = "", id }: AnimatedCardProps) {
  return (
    <div
      id={id}
      className={`animate-fade-up ${className}`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
