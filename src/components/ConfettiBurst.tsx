import { useState, useEffect, useCallback } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

interface Props {
  /** Whether to show the confetti burst. */
  active: boolean;
  /** Number of particles. */
  count?: number;
  /** Duration in milliseconds. */
  duration?: number;
  /** Callback when animation completes. */
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  delay: number;
  size: number;
}

const COLORS = [
  "var(--color-amber-400)",
  "var(--color-emerald-400)",
  "var(--color-blue-400)",
  "var(--color-purple-400)",
  "var(--color-rose-400)",
  "var(--color-peach-400)",
];

/**
 * ConfettiBurst — a celebration particle effect.
 * Renders colored confetti particles that burst outward and fade.
 * Uses CSS animations for smooth 60fps performance.
 */
export default function ConfettiBurst({ active, count = 20, duration = 1500, onComplete }: Props) {
  const prefersReduced = useReducedMotion();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  const generateParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: 50 + (Math.random() - 0.5) * 80, // spread from center
        y: 50 + (Math.random() - 0.5) * 60,
        rotation: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 200,
        size: 4 + Math.random() * 6,
      });
    }
    return newParticles;
  }, [count]);

  useEffect(() => {
    if (active && !prefersReduced) {
      setParticles(generateParticles());
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
      if (active && prefersReduced) onComplete?.();
    }
  }, [active, duration, generateParticles, onComplete, prefersReduced]);

  if (!visible || particles.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute confetti-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}ms`,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  );
}
