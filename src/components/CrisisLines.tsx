import React from "react";
import { Phone, ExternalLink } from "lucide-react";
import { getCrisisLines } from "../services/crisisResources";

// One place that renders the user's region crisis lines correctly (tel links, directory links, or
// plain text for guidance lines). Used everywhere crisis numbers appear so they stay consistent and
// region-correct. Always renders ≥1 line (registry guarantees a non-empty International fallback).
const TONES: Record<string, string> = {
  rose: "text-rose-200 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20",
  amber: "text-amber-100 bg-amber-500/15 border-amber-500/30 hover:bg-amber-500/25",
};

export default function CrisisLines({ tone = "rose", compact = false }: { tone?: "rose" | "amber"; compact?: boolean }) {
  const lines = getCrisisLines();
  const base = `flex items-center gap-2 font-semibold rounded-lg border transition-colors ${compact ? "text-xs px-3 py-2" : "text-sm px-3 py-2.5"} ${TONES[tone] ?? TONES.rose}`;
  return (
    <div className="space-y-1.5" id="crisis-lines">
      {lines.map((l, i) => {
        if (l.tel) {
          return (
            <a key={i} href={`tel:${l.tel}`} className={base}>
              <Phone className="w-4 h-4 shrink-0" />
              <span>{l.name}: {l.display}{l.note ? <span className="font-normal opacity-70"> · {l.note}</span> : null}</span>
            </a>
          );
        }
        if (l.url) {
          return (
            <a key={i} href={l.url} target="_blank" rel="noreferrer" className={base}>
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>{l.name} — {l.display}</span>
            </a>
          );
        }
        return (
          <div key={i} className={`${base} cursor-default`}>
            <Phone className="w-4 h-4 shrink-0" />
            <span>{l.display}{l.note ? <span className="font-normal opacity-70"> ({l.note})</span> : null}</span>
          </div>
        );
      })}
    </div>
  );
}
