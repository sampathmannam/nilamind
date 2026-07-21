import { LifeBuoy } from "lucide-react";

// One consistent, always-visible crisis affordance for every top-level surface (all four tabs + the
// assessment). Design review (2026-07-18) found the crisis control was missing on the Nila + Tools tabs
// and rendered at the palette's lowest-visibility tier (text-ink-faint) where it existed — the single most
// important control on the screen was the hardest to find. This is a CALM but clearly-a-help control: a
// small rose pill with a recognizable lifebuoy + "Help" label, per the UX_RESEARCH "persistent calm crisis
// access in the header" mandate. 44px target, real focus ring, labelled for screen readers.
export default function CrisisHeaderButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label="Get help now"
      title="Get help now"
      className={`flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 px-3 min-w-[44px] min-h-[44px] text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-rose-400 focus-visible:outline-offset-2 ${className}`}
    >
      <LifeBuoy className="w-4 h-4 shrink-0" aria-hidden="true" />
      Help
    </button>
  );
}
