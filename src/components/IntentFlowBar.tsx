export type IntentPhase = "calm" | "data" | "protocol";

export interface IntentFlowBarProps {
  currentPhase: IntentPhase;
  onPhaseChange: (phase: IntentPhase) => void;
  timeMode?: "morning" | "afternoon" | "evening" | "night";
  state?: string | null;
  className?: string;
  /** U1.5 — When true, show the tooltip for the current phase below the bar. */
  tooltipDismissed?: boolean;
  /** U1.5 — Called when the user dismisses the tooltip. */
  onDismissTooltip?: () => void;
  /** U3.4 — Current streak day for the pathway label. */
  day?: number;
  /** U3.4 — Next due item description shown inline in the active phase label. */
  nextDue?: string;
}

const PHASES: { id: IntentPhase; label: string }[] = [
  { id: "calm", label: "Calm" },
  { id: "data", label: "Data" },
  { id: "protocol", label: "Protocol" },
];

const PHASE_ICONS: Record<IntentPhase, string> = {
  calm: "🧘",
  data: "📊",
  protocol: "🎯",
};

const PHASE_DESCRIPTIONS: Record<IntentPhase, string> = {
  calm: "Ground yourself — check in and breathe. Best when you feel anxious or need a pause.",
  data: "Review today's check-in, intentions, and weekly patterns.",
  protocol: "Practice skills and track your coping plan progress.",
};

const TIME_SUGGESTIONS: Record<string, IntentPhase> = {
  morning: "data",
  afternoon: "data",
  evening: "protocol",
  night: "calm",
};

const STATE_SUGGESTIONS: Record<string, IntentPhase> = {
  anxious: "calm",
  elevated: "calm",
  low: "data",
  crisis: "calm",
};

export function suggestPhase(
  state: string | null | undefined,
  timeMode?: string
): IntentPhase {
  if (state && STATE_SUGGESTIONS[state]) return STATE_SUGGESTIONS[state];
  if (timeMode && TIME_SUGGESTIONS[timeMode]) return TIME_SUGGESTIONS[timeMode];
  return "data";
}

export default function IntentFlowBar({
  currentPhase,
  onPhaseChange,
  className = "",
  tooltipDismissed = true,
  onDismissTooltip,
  day,
  nextDue,
}: IntentFlowBarProps) {
  return (
    <div>
    <nav
      // 2026-08-05 audit: was `bg-[var(--color-slate-100)] dark:bg-[var(--color-slate-800)]` — Tailwind's
      // BUILT-IN `dark:` variant, which follows the OS `prefers-color-scheme` media query rather than this
      // app's own in-app theme toggle. Confirmed broken combination on an emulator with system dark mode ON
      // but the app itself set to Light: the OS-driven `dark:` classes fired on top of an otherwise
      // light-themed page, producing a low-contrast/inconsistent tab bar. Every other themed surface in the
      // app uses semantic tokens (bg-fill/bg-card/text-ink/text-ink-muted) that switch on the in-app toggle
      // instead — same fix as ValuePropBanner.tsx.
      className={`flex items-center justify-between rounded-xl bg-fill p-1 ${className}`}
      aria-label="Intent phase navigation"
    >
      {PHASES.map((phase) => {
        const active = currentPhase === phase.id;
        return (
          <button
            key={phase.id}
            onClick={() => onPhaseChange(phase.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
              ${active
                ? "bg-card text-ink shadow-sm"
                : "text-ink-muted hover:text-ink"
              }`}
            aria-current={active ? "step" : undefined}
          >
            <span aria-hidden="true">{PHASE_ICONS[phase.id]}</span>
            <span>{phase.label}</span>
            {active && (day !== undefined || nextDue) && (
              <span className="text-[10px] text-ink-faint font-normal ml-1">
                · {day !== undefined && `Day ${day}`}{day !== undefined && nextDue ? ' · ' : ''}{nextDue ?? ''}
              </span>
            )}
          </button>
        );
      })}
    </nav>

    {/* U1.5 — Phase tooltip: one-line description, shown until dismissed */}
    {!tooltipDismissed && (
      <div className="mt-2 flex items-start gap-2 bg-fill/80 border border-line/30 rounded-xl px-3 py-2 text-base text-ink-muted leading-relaxed animate-fade-in">
        <span className="flex-1">{PHASE_DESCRIPTIONS[currentPhase]}</span>
        <button
          onClick={() => onDismissTooltip?.()}
          className="shrink-0 p-0.5 rounded text-ink-faint hover:text-ink-2 cursor-pointer min-w-[22px] min-h-[22px] flex items-center justify-center"
          aria-label="Dismiss tip"
        >
          ✕
        </button>
      </div>
    )}
    </div>
  );
}
