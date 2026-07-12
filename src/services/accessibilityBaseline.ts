import type { AdaptiveMode } from "./adaptiveTheme";

export function hasMinTapTarget(classString: string): boolean {
  if (!classString) return false;
  if (/\bmin-h-\[44px\]/.test(classString)) return true;
  if (/\bmin-w-\[44px\]/.test(classString)) return true;
  if (/\bpy-4\b/.test(classString)) return true;
  if (/\bpy-3\.5\b/.test(classString)) return true;
  if (/\bp-\[44px\]/.test(classString)) return true;
  return false;
}

export function hasFocusRing(classString: string): boolean {
  if (!classString) return false;
  if (/\bfocus-ring\b/.test(classString)) return true;
  if (/\bfocus(?:-\w+)?:ring-\d/.test(classString)) return true;
  return false;
}

export function textSizeFloor(classString: string): boolean {
  if (!classString) return true;
  if (/text-\[11px\]/.test(classString)) return false;
  if (/text-\[10px\]/.test(classString)) return false;
  if (/text-\[9px\]/.test(classString)) return false;
  return true;
}

export function isSemanticBackground(classString: string): boolean {
  if (!classString) return true;
  if (/\bbg-slate-\d{3}(\/\d+)?\b/.test(classString)) return false;
  return true;
}

export function shouldReduceMotion(
  adaptiveMode: AdaptiveMode | string,
  prefersReducedMotionOS = false
): { reduce: boolean; animationMs: number } {
  if (prefersReducedMotionOS) return { reduce: true, animationMs: 0 };
  if (adaptiveMode === "elevated") return { reduce: true, animationMs: 350 };
  return { reduce: false, animationMs: 200 };
}

export interface ButtonClassOpts {
  variant: "primary" | "secondary" | "danger" | "warm";
  enforceTap?: boolean;
}

export function buttonClasses(opts: ButtonClassOpts): string {
  const enforce = opts.enforceTap !== false;
  const base = "text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center disabled:opacity-50";
  const tap = enforce ? " min-h-[44px]" : "";
  const focus = enforce ? " focus-ring" : "";
  const variants: Record<ButtonClassOpts["variant"], string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-500",
    secondary: "bg-page border border-slate-800 text-slate-200 hover:bg-raised",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
    warm: "bg-amber-600 text-white hover:bg-amber-500",
  };
  return base + variants[opts.variant] + tap + focus;
}