import React, { useMemo, useState } from "react";
import { Search, X, ChevronRight, Lightbulb } from "lucide-react";
import { buildToolGroups, personalizeToolOrder } from "./toolsRows";
import { getUserGoals } from "../services/chatSuggestions";

interface Props {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
}

// Dedicated Tools tab (2026-07-18 QA, per docs/UX_RESEARCH.md's 4-tab IA: Today · Nila · Tools · You). The
// tool library used to be a collapsible "All tools" section at the bottom of Today; giving it its own tab
// lets Today lead with the daily loop while every skill / screening / tracker has one stable home here.
// Search + goal-personalized ordering carry over unchanged.
export default function ToolsScreen({ go, onEpisode, phoneEnabled }: Props) {
  const [toolSearch, setToolSearch] = useState("");
  const [showMoreSkills, setShowMoreSkills] = useState(false);
  const groups = personalizeToolOrder(buildToolGroups({ go, onEpisode, phoneEnabled }), getUserGoals());

  const filteredGroups = useMemo(() => {
    if (!toolSearch.trim()) return groups;
    const q = toolSearch.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        rows: g.rows.filter((r) => r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)),
      }))
      .filter((g) => g.rows.length > 0);
  }, [groups, toolSearch]);

  // An active search reveals every group (including the collapsed "Skills & practice" set) so a query
  // can find any tool; otherwise `.more` groups stay behind the expander.
  const visibleGroups = filteredGroups.filter((g) => showMoreSkills || toolSearch.trim() || !g.more);

  return (
    <div className="space-y-5 max-w-md mx-auto" id="tools-hub">
      <header className="space-y-0.5">
        <h1 className="editorial text-2xl text-slate-100">Tools</h1>
        <p className="text-xs text-slate-400">Skills, trackers, and practices — here whenever you need them.</p>
      </header>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
        <input
          type="text"
          value={toolSearch}
          onChange={(e) => setToolSearch(e.target.value)}
          placeholder="Search tools..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          aria-label="Search tools"
        />
        {toolSearch && (
          <button
            onClick={() => setToolSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {visibleGroups.map((g) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 px-1">{g.title}</h2>
          <div className="space-y-2">
            {g.rows.map((r) => (
              <button
                key={r.id}
                onClick={r.onTap}
                id={`tools-${r.id}`}
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

      {visibleGroups.length === 0 && toolSearch && (
        <p className="text-sm text-slate-500 text-center py-4">No tools match "{toolSearch}"</p>
      )}

      {!showMoreSkills && filteredGroups.some((g) => g.more) && !toolSearch && (
        <button
          onClick={() => setShowMoreSkills(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-700/50 hover:border-slate-600/50 text-slate-400 hover:text-slate-300 text-sm font-medium transition-all cursor-pointer active:scale-[0.99]"
        >
          <Lightbulb className="w-4 h-4 text-amber-400" aria-hidden="true" />
          Skills &amp; practice
        </button>
      )}
    </div>
  );
}
