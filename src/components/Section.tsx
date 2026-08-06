import React from "react";

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Header-only divider: a labelled band that breaks a long scroll into sections. Renders the same
 *  header styling as <Section> but without a wrapping <section>, so it can sit above sibling content
 *  that isn't otherwise grouped. Single source of truth for section-header styling lives here. */
export function SectionDivider({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div
      className={`flex items-center gap-2 pt-3 ${className}`.trim()}
      role="separator"
      aria-label={label}
    >
      <h2 className="text-xs font-bold text-ink-muted uppercase tracking-wider whitespace-nowrap">{label}</h2>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}

export default function Section({ title, icon, children, action, className = "" }: SectionProps) {
  return (
    <section className={`space-y-5 ${className}`.trim()}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <span className="text-ink-muted" aria-hidden="true">{icon}</span>}
          <h2 className="text-xs font-bold text-ink-muted uppercase tracking-wider">{title}</h2>
        </div>
        {action && <div className="text-[11px]">{action}</div>}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
