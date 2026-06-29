import { ChevronRight } from "lucide-react";
import { buildYouGroups } from "./youRows";

// Redesign §2 — the "You" hub: review / manage / learn (calmer moments). The row set lives in
// ./youRows (the single source of truth, unit-tested in youRows.test.ts); this component is just the
// renderer. Add/remove rows there, not here. Rows call go(target); App routes to the existing screens.

export default function YouScreen({ go }: { go: (target: string) => void }) {
  const groups = buildYouGroups();

  return (
    <div className="space-y-6 max-w-md mx-auto" id="you-hub">
      <header className="space-y-1">
        <h1 className="text-3xl font-display font-semibold text-slate-100">You</h1>
        <p className="text-sm text-slate-400 mt-0.5">Your progress and your privacy — held on your device.</p>
      </header>

      {groups.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">{g.title}</h2>
          <div className="space-y-2">
            {g.rows.map((r) => (
              <button
                key={r.id}
                onClick={() => go(r.id)}
                id={`you-${r.id}`}
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

      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-4">
        NilaMind is a support alongside — not a substitute for — professional care.
      </p>
    </div>
  );
}
