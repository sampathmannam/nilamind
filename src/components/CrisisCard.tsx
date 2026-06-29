import { LifeBuoy } from "lucide-react";
import { getCrisisReply } from "../safety";
import CrisisLines from "./CrisisLines";

// The shared §9 crisis surface shown wherever an input gate trips (CBT Thought Record, DBT Diary
// quick-note, Dashboard deep-assessment). Centralised so the deterministic crisis copy + region
// crisis lines stay IDENTICAL across every entry point — a change here updates them all at once.
// Only the heading and outer margin vary per screen.
export default function CrisisCard({
  heading,
  id,
  className = "",
}: {
  heading: string;
  id?: string;
  className?: string;
}) {
  return (
    <div id={id} className={`bg-card border border-rose-500/30 p-4 rounded-2xl space-y-3 ${className}`.trim()}>
      <h4 className="text-sm font-semibold text-rose-200 flex items-center gap-1.5">
        <LifeBuoy className="w-4 h-4" /> {heading}
      </h4>
      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{getCrisisReply()}</p>
      <CrisisLines tone="rose" compact />
    </div>
  );
}
