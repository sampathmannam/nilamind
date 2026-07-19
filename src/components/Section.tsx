import React from "react";

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function Section({ title, children, action, className = "" }: SectionProps) {
  return (
    <section className={`space-y-3 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-ink-muted uppercase tracking-wider">{title}</h2>
        {action && <div className="text-[11px]">{action}</div>}
      </div>
      {children}
    </section>
  );
}
