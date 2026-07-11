import { ChevronRight, Sparkles, Flame } from "lucide-react";
import { buildYouGroups } from "./youRows";
import { computeCompassionateStreak } from "../services/streaks";

export default function YouScreen({ go }: { go: (target: string) => void }) {
  const groups = buildYouGroups();
  let streak = { current: 0, longest: 0, message: "Welcome" };
  try {
    streak = computeCompassionateStreak();
  } catch {
    /* ignore */
  }

  return (
    <div className="space-y-6 max-w-md mx-auto" id="you-hub">
      {/* Profile card */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full sun-cta flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="editorial text-xl text-slate-100">You</h1>
            <p className="text-xs text-slate-400 mt-0.5">{streak.message}</p>
          </div>
        </div>
        <div className="flex gap-6 pt-1">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-slate-100">{streak.current}</span>
            <span className="text-[11px] text-slate-400">day streak</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-100">{streak.longest}</span>
            <span className="text-[11px] text-slate-400">best</span>
          </div>
        </div>
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
