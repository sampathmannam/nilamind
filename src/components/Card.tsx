import React from "react";

export type CardVariant = "glass" | "raised" | "fill";
export type CardPadding = "sm" | "md" | "lg";
export type CardGap = "none" | "sm" | "md";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  gap?: CardGap;
  accent?: "none" | "crisis" | "warning" | "success";
  className?: string;
  role?: string;
  "aria-label"?: string;
  id?: string;
}

const PADDING: Record<CardPadding, string> = {
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

const GAP: Record<CardGap, string> = {
  none: "",
  sm: "space-y-2",
  md: "space-y-3",
};

const ACCENT: Record<string, string> = {
  crisis: "border-l-4 border-l-rose-500",
  warning: "border-l-4 border-l-amber-500",
  success: "border-l-4 border-l-emerald-500",
};

const VARIANT: Record<CardVariant, string> = {
  glass: "glass",
  raised: "bg-card border border-line-strong",
  fill: "bg-fill",
};

export default function Card({
  children,
  variant = "glass",
  padding = "md",
  gap = "sm",
  accent = "none",
  className = "",
  role,
  "aria-label": ariaLabel,
  id,
}: CardProps) {
  return (
    <div
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={`rounded-2xl ${GAP[gap]} ${VARIANT[variant]} ${PADDING[padding]} ${accent !== "none" ? ACCENT[accent] : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
