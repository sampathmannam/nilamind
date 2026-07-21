import { useMemo, useState } from "react";
import { Search, X, ChevronRight, Lightbulb } from "lucide-react";
import { buildToolGroups, personalizeToolOrder, personalizeToolByContext } from "./toolsRows";
import { getUserGoals } from "../services/chatSuggestions";
import { useUserContext } from "../hooks/useUserContext";
import CrisisHeaderButton from "./CrisisHeaderButton";

interface Props {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
  onOpenCrisis: () => void;
}

// Dedicated Tools tab (2026-07-18 QA, per docs/UX_RESEARCH.md's 4-tab IA: Today · Nila · Tools · You). The
// tool library used to be a collapsible "All tools" section at the bottom of Today; giving it its own tab
// lets Today lead with the daily loop while every skill / screening / tracker has one stable home here.
// Search + goal-personalized ordering carry over unchanged. UX-3: time/state-aware ordering is layered on
// top so the right tool for the moment (wind-down at night, grounding when anxious) leads.
export default function ToolsScreen({ go, onEpisode, phoneEnabled, onOpenCrisis }: Props) {
  const [toolSearch, setToolSearch] = useState("");
  const [showMoreSkills, setShowMoreSkills] = useState(false);
  const { timeMode, state } = useUserContext();
  const groups = personalizeToolByContext(
    personalizeToolOrder(buildToolGroups({ go, onEpisode, phoneEnabled }), getUserGoals()),
    { timeMode, state },
  );

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
      <header className="flex items-start gap-3">
        <div className="space-y-0.5">
          <h1 className="editorial text-2xl text-ink">Tools</h1>
          <p className="text-xs text-ink-muted">Skills, trackers, and practices — here whenever you need them.</p>
        </div>
      </header>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" aria-hidden="true" />
        <input
          type="text"
          value={toolSearch}
          onChange={(e) => setToolSearch(e.target.value)}
          placeholder="Search tools..."
          className="w-full pl-9 pr-8 py-2.5 rounded-xl glass text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-blue-500/50 transition-colors"
          aria-label="Search tools"
        />
        {toolSearch && (
          <button
            onClick={() => setToolSearch("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-faint hover:text-ink-2 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {visibleGroups.map((g, gi) => (
        <section key={g.title} className="space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-widest text-ink-faint px-1">{g.title}</h2>
          <div className="space-y-2">
            {g.rows.map((r) => (
              <button
                key={r.id}
                onClick={r.onTap}
                id={`tools-${r.id}`}
                className={`w-full flex items-center gap-3 transition-all active:scale-[0.99] cursor-pointer text-left ${
                  g.more
                    ? "glass p-3.5 rounded-xl opacity-80 hover:opacity-100"
                    : "glass p-4 rounded-2xl hover:brightness-125"
                }`}
              >
                <span className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-xl ${
                  g.more ? "" : "bg-fill/50"
                }`}>
                  <r.Icon className={g.more ? "w-4 h-4" : "w-5 h-5"} aria-hidden="true" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block font-bold text-ink ${g.more ? "text-xs" : "text-sm"}`}>{r.label}</span>
                  <span className={`block text-ink-muted ${g.more ? "text-[11px]" : "text-[11px]"}`}>{r.sub}</span>
                  {"help" in r && r.help && (
                    <span className="block text-[10px] text-ink-faint mt-0.5 leading-tight">{r.help}</span>
                  )}
                </span>
                <ChevronRight className={`shrink-0 text-ink-faint ${g.more ? "w-4 h-4" : "w-5 h-5"}`} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {visibleGroups.length === 0 && toolSearch && (
        <p className="text-sm text-ink-faint text-center py-4">No tools match "{toolSearch}"</p>
      )}

      {filteredGroups.some((g) => g.more) && !toolSearch && (
        <button
          onClick={() => setShowMoreSkills(!showMoreSkills)}
          aria-expanded={showMoreSkills}
          className="w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-xl border border-line hover:border-line-strong text-ink-faint hover:text-ink-muted text-xs font-medium transition-all cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
          {showMoreSkills ? "Less" : "More resources"}
        </button>
      )}

      {/* Crisis button — bottom thumb zone, always reachable */}
      <div className="flex justify-center pt-2 pb-4">
        <CrisisHeaderButton onClick={onOpenCrisis} />
      </div>
    </div>
  );
}
