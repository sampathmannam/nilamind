import React from "react";
import Card from "./Card";

interface StatCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  variant?: "glass" | "raised" | "fill";
  className?: string;
}

export default function StatCard({ icon, value, label, variant = "glass", className = "" }: StatCardProps) {
  return (
    <Card variant={variant} padding="sm" className={`text-center ${className}`}>
      <div className="flex justify-center">{icon}</div>
      <p className="text-lg font-bold text-ink leading-tight">{value}</p>
      <p className="text-[10px] text-ink-muted leading-tight">{label}</p>
    </Card>
  );
}
