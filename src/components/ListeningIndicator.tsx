import { Mic } from "lucide-react";

/** Calm, always-visible dot shown only while the wake word mic is hot. */
export default function ListeningIndicator({ active, onClick }: { active: boolean; onClick?: () => void }) {
  if (!active) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Hey Nila is listening — tap for settings"
      className="fixed top-3 right-3 z-[60] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/90 border border-blue-500/40 backdrop-blur shadow"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/60 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
      </span>
      <Mic className="w-3 h-3 text-blue-300" />
    </button>
  );
}
