import { ChevronRight } from "lucide-react";
import { buildToolGroups } from "./toolsRows";

// Redesign §2 — the "Tools" hub. The row set lives in ./toolsRows (the single source of truth, unit-
// tested in toolsRows.test.ts); this component is just the renderer. Add/remove rows there, not here.

export default function ToolsScreen({
  go,
  phoneEnabled,
  onEpisode,
}: {
  go: (target: string) => void;
  phoneEnabled: boolean;
  onEpisode: () => void;
}) {
  const groups = buildToolGroups({ go, onEpisode, phoneEnabled });

  return (
    <div className="space-y-6 max-w-md mx-auto" id="tools-hub">
      <header className="space-y-1">
        <h1 className="text-3xl font-display font-semibold text-slate-100">Tools</h1>
        <p className="text-sm text-slate-400 mt-0.5">Everything's here when you want it — no rush.</p>
      </header>

      {groups.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">{g.title}</h2>
          <div className="space-y-2">
            {g.rows.map((r) => (
              <button
                key={r.id}
                onClick={r.onTap}
                id={`tools-${r.id}`}
                className="w-full flex items-center gap-3 bg-card border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition-all cursor-pointer text-left"
              >
                <span className="shrink-0"><r.Icon className={r.iconClass} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-100">{r.label}</span>
                  <span className="block text-[11px] text-slate-400">{r.sub}</span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
