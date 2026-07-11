import { ChevronRight, Sparkles } from "lucide-react";
import { buildYouGroups } from "./youRows";
import { computeCompassionateStreak } from "../services/streaks";

export default function YouScreen({ go }: { go: (target: string) => void }) {
  const groups = buildYouGroups();
  let streak = { current: 0, totalActiveDays: 0, message: "Welcome" };
  try {
    const s = computeCompassionateStreak();
    streak = { current: s.current, totalActiveDays: s.totalActiveDays, message: s.message };
  } catch {
    /* ignore */
  }

  return (
    <div className="space-y-6 max-w-md mx-auto" id="you-hub">
      {/* Profile card — no streak numbers (UX_RESEARCH.md §3: streaks mirror addiction models).
          Instead, a simple welcome and total days count. */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="editorial text-xl text-slate-100">You</h1>
            <p className="text-xs text-slate-400 mt-0.5">{streak.message}</p>
          </div>
        </div>
        {streak.totalActiveDays > 0 && (
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-800">
            {streak.totalActiveDays} day{streak.totalActiveDays !== 1 ? "s" : ""} spent on your wellbeing
          </p>
        )}
      </div>

      {groups.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">{g.title}</h2>
          <div className="space-y-2">
            {g.rows.map((r) => (
              <button
                key={r.id}
                onClick={() => go(r.id)}
                id={`you-${r.id}`}
                className="w-full flex items-center gap-3 glass hover:brightness-125 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left"
              >
                <span className="shrink-0"><r.Icon className={r.iconClass} aria-hidden="true" /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-slate-100">{r.label}</span>
                  <span className="block text-[11px] text-slate-400">{r.sub}</span>
                </span>
                <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
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
