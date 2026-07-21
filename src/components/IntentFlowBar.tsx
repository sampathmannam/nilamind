export type IntentPhase = "calm" | "data" | "protocol";

export interface IntentFlowBarProps {
  currentPhase: IntentPhase;
  onPhaseChange: (phase: IntentPhase) => void;
  timeMode?: "morning" | "afternoon" | "evening" | "night";
  state?: string | null;
  className?: string;
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
}: IntentFlowBarProps) {
  return (
    <nav
      className={`flex items-center justify-between rounded-xl bg-[var(--gray-100)] p-1 dark:bg-[var(--gray-800)] ${className}`}
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
                ? "bg-white text-[var(--text-main)] shadow-sm dark:bg-[var(--gray-700)] dark:text-white"
                : "text-[var(--gray-500)] hover:text-[var(--text-main)] dark:text-[var(--gray-400)]"
              }`}
            aria-current={active ? "step" : undefined}
          >
            <span aria-hidden="true">{PHASE_ICONS[phase.id]}</span>
            <span>{phase.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
