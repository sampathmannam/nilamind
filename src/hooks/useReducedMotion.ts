import { useEffect, useState } from "react";

/** Returns true if user prefers reduced motion */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return prefersReduced;
}

/** Conditional className helper — returns empty string if reduced motion, else the provided class */
export function motionClass(prefersReduced: boolean, className: string): string {
  return prefersReduced ? "" : className;
}

/** Animation duration respecting reduced motion (returns 0 for reduced) */
export function animationDuration(prefersReduced: boolean, ms: number): number {
  return prefersReduced ? 0 : ms;
}

/** CSS transition string respecting reduced motion */
export function transition(prefersReduced: boolean, ...props: string[]): string {
  if (prefersReduced) return "none";
  return props.join(", ");
}