// StatPill — a compact horizontal pill showing icon + number + label.
// Used in rows of 3 for quick-glance metrics on Dashboard and TodayScreen.
// Design: glanceable, tappable, consistent sizing.

interface StatPillProps {
  /** Emoji or icon. */
  icon: string;
  /** Primary value. */
  value: string;
  /** Label text. */
  label: string;
  /** Tap handler. */
  onTap?: () => void;
  className?: string;
}

export default function StatPill({ icon, value, label, onTap, className = "" }: StatPillProps) {
  return (
    <button
      onClick={onTap}
      disabled={!onTap}
      className={`flex-1 glass rounded-xl px-3 py-2.5 text-center space-y-0.5 min-w-0 ${onTap ? "active:scale-[0.97] transition-transform cursor-pointer hover:brightness-110" : "cursor-default"} ${className}`}
      aria-label={`${label}: ${value}`}
    >
      <span className="text-base block" aria-hidden="true">{icon}</span>
      <span className="text-sm font-bold text-ink block leading-tight">{value}</span>
      <span className="text-xs text-ink-muted block leading-tight">{label}</span>
    </button>
  );
}

/** A row of 3 StatPills. */
export function StatPillRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-2 ${className}`} role="group">
      {children}
    </div>
  );
}
