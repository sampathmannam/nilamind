import { ChevronRight } from "lucide-react";

interface ToolRowProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  accent?: string;
  className?: string;
}

export default function ToolRow({
  icon,
  label,
  subtitle,
  onPress,
  accent,
  className = "",
}: ToolRowProps) {
  return (
    <button
      onClick={onPress}
      aria-label={subtitle ? `${label}: ${subtitle}` : label}
      className={`flex items-center gap-3 p-3 rounded-xl hover:bg-fill transition-colors cursor-pointer active:scale-[0.99] min-h-[44px] text-left ${className}`}
    >
      <span
        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${accent ?? "bg-fill"}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {subtitle && <span className="block text-xs text-ink-2 mt-0.5">{subtitle}</span>}
      </span>
      <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
    </button>
  );
}
