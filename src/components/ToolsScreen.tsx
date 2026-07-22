import { useMemo, useState, useEffect } from "react";
import {
  Search, X, ChevronRight, Heart, Sparkles, Wind, Moon,
  Lightbulb, Activity, SearchX, ShieldAlert, type LucideIcon,
} from "lucide-react";
import { buildToolGroups, personalizeToolOrder, personalizeToolByContext } from "./toolsRows";
import type { ToolGroup, ToolRow } from "./toolsRows";
import { getUserGoals } from "../services/chatSuggestions";
import { useUserContext } from "../hooks/useUserContext";
import CrisisHeaderButton from "./CrisisHeaderButton";

interface Props {
  go: (target: string) => void;
  onEpisode: () => void;
  phoneEnabled: boolean;
  onOpenCrisis: () => void;
}

// ── Context-aware tool chips ──────────────────────────────────────
interface ToolChip {
  id: string;
  label: string;
  icon: LucideIcon;
}

function contextToolChips(timeMode: string, state: string | null): ToolChip[] {
  if (state === "crisis") return [];
  if (state === "elevated")
    return [
      { id: "plan", label: "Grounding", icon: Wind },
      { id: "winddown", label: "Wind-down", icon: Moon },
    ];
  if (state === "anxious")
    return [
      { id: "plan", label: "Grounding", icon: Wind },
      { id: "reach_out", label: "Reach out", icon: Heart },
    ];
  if (state === "low")
    return [
      { id: "ema_checkin", label: "Check-in", icon: Heart },
      { id: "reach_out", label: "Reach out", icon: Heart },
    ];
  if (timeMode === "night" || timeMode === "evening")
    return [
      { id: "winddown", label: "Wind-down", icon: Moon },
      { id: "plan", label: "Grounding", icon: Wind },
      { id: "diary", label: "Diary", icon: Lightbulb },
    ];
  if (timeMode === "morning")
    return [
      { id: "medication", label: "Medication", icon: Heart },
      { id: "ema_checkin", label: "Check-in", icon: Heart },
    ];
  return [];
}

// ── Category filter ────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all", label: "All", icon: Sparkles },
  { id: "moment", label: "Calm", icon: Wind },
  { id: "log", label: "Track", icon: Activity },
  { id: "skills", label: "Skills", icon: Lightbulb },
] as const;

type CatId = (typeof CATEGORIES)[number]["id"];

function matchesCategory(group: ToolGroup, cat: CatId): boolean {
  if (cat === "all") return true;
  const ids = new Set(group.rows.map((r) => r.id));
  if (cat === "moment") return ids.has("plan") || ids.has("winddown");
  if (cat === "log") return ids.has("ema_checkin") || ids.has("diary");
  if (cat === "skills") return ids.has("problem_solving") || ids.has("exposure") || ids.has("values_to_action");
  return true;
}

// ── Recent-tool tracker (module-level, survives tab-switch remount) ──
const RECENT_MAX = 3;
let _recentToolIds: string[] = [];

function trackRecent(id: string) {
  _recentToolIds = [id, ..._recentToolIds.filter((x) => x !== id)].slice(0, RECENT_MAX);
}

// U8.1 — Category filter persistence (survives remount, resets on page refresh)
let _lastActiveCategory: CatId = "all";

// ── Component ──────────────────────────────────────────────────────
export default function ToolsScreen({ go, onEpisode, phoneEnabled, onOpenCrisis }: Props) {
  const [activeCategory, setActiveCategory] = useState<CatId>(() => _lastActiveCategory);
  // U8.1 — persist active category across remounts
  useEffect(() => { _lastActiveCategory = activeCategory; }, [activeCategory]);
  const [toolSearch, setToolSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>(_recentToolIds);
  const { timeMode, state } = useUserContext();

  const groups = useMemo(
    () =>
      personalizeToolByContext(
        personalizeToolOrder(buildToolGroups({ go, onEpisode, phoneEnabled }), getUserGoals()),
        { timeMode, state },
      ),
    [go, onEpisode, phoneEnabled, timeMode, state],
  );

  const chips = useMemo(() => contextToolChips(timeMode, state), [timeMode, state]);

  const filteredGroups = useMemo(() => {
    let result = groups;
    if (activeCategory !== "all") {
      result = result.filter((g) => matchesCategory(g, activeCategory));
    }
    if (toolSearch.trim()) {
      const q = toolSearch.toLowerCase();
      result = result
        .map((g) => ({
          ...g,
          rows: g.rows.filter((r) => r.label.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q)),
        }))
        .filter((g) => g.rows.length > 0);
    }
    return result;
  }, [groups, activeCategory, toolSearch]);

  const recentTools = useMemo(() => {
    if (recentIds.length === 0) return [];
    const all = groups.flatMap((g) => g.rows);
    return recentIds.map((id) => all.find((r) => r.id === id)).filter((r): r is ToolRow => !!r);
  }, [recentIds, groups]);

  const handleToolTap = (id: string, onTap: () => void) => {
    trackRecent(id);
    setRecentIds([..._recentToolIds]);
    onTap();
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const clearFilters = () => {
    setActiveCategory("all");
    setToolSearch("");
  };

  return (
    <div className="space-y-4 max-w-md mx-auto px-4" id="tools-hub">
      {/* Header */}
      <header className="space-y-1 pt-2">
        <h1 className="editorial text-[26px] text-ink tracking-tight">Tools</h1>
        <p className="text-[12px] text-ink-muted">Skills, trackers, and practices — here whenever you need them.</p>
      </header>

      {/* Context-aware tool chips — tap to go directly */}
      {chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
          {chips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleToolTap(chip.id, () => go(chip.id))}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent/10 border border-accent/25 text-sm text-accent hover:bg-accent/20 transition-colors whitespace-nowrap shrink-0 min-h-[44px] focus-ring"
            >
              <chip.icon className="w-4 h-4" aria-hidden="true" />
              <span className="font-medium">{chip.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Category filter chips — primary navigation */}
      <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all whitespace-nowrap shrink-0 min-h-[36px] focus-ring ${
              activeCategory === cat.id
                ? "bg-accent/15 text-accent border border-accent/30"
                : "bg-fill text-ink-muted border border-line hover:text-ink-2 hover:border-line-strong"
            }`}
          >
            <cat.icon className="w-3.5 h-3.5" aria-hidden="true" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* U8.2 — Search + mini crisis button */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCrisis}
          className="shrink-0 w-9 h-9 rounded-xl bg-danger/10 border border-danger/20 flex items-center justify-center text-rose-400 hover:text-rose-400 hover:bg-danger/15 transition-all cursor-pointer focus-ring"
          aria-label="Crisis resources"
        >
          <ShieldAlert className="w-4 h-4" aria-hidden="true" />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint" aria-hidden="true" />
          <input
            type="text"
            value={toolSearch}
            onChange={(e) => setToolSearch(e.target.value)}
            placeholder="Find a tool by name..."
            className="w-full pl-8 pr-8 py-2.5 rounded-xl bg-card border border-line text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
            aria-label="Search tools"
          />
          {toolSearch && (
            <button
              onClick={() => setToolSearch("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-ink-faint hover:text-ink-2 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Recently used — personal relevance, only shows after first tap */}
      {recentTools.length > 0 && !toolSearch && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 pl-3 border-l-2 border-accent py-0.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">Recent</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {recentTools.map((r) => (
              <button
                key={r.id}
                onClick={() => handleToolTap(r.id, r.onTap)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-line hover:border-line-strong text-sm text-ink-2 hover:text-ink transition-all cursor-pointer min-h-[44px] focus-ring"
              >
                <r.Icon className="w-4 h-4" aria-hidden="true" />
                <span className="font-medium text-xs">{r.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Group sections */}
      {filteredGroups.map((g) => {
        const isExpanded = expandedGroups.has(g.title) || toolSearch.trim().length > 0;
        const visibleRows = g.more && !isExpanded ? g.rows.slice(0, 2) : g.rows;
        const hiddenCount = g.more ? g.rows.length - 2 : 0;

        return (
          <section key={g.title} className="space-y-2">
            <div className="flex items-center gap-2 pl-3 border-l-2 border-accent py-0.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{g.title}</h2>
              {g.more && !isExpanded && (
                <span className="text-[10px] text-ink-faint ml-auto">{g.rows.length} tools</span>
              )}
            </div>
            <div className="space-y-2">
              {visibleRows.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleToolTap(r.id, r.onTap)}
                  id={`tools-${r.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-line bg-card hover:border-line-strong hover:bg-fill transition-all active:scale-[0.99] cursor-pointer text-left focus-ring"
                >
                  <span className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-accent/10">
                    <r.Icon className="w-5 h-5 text-accent" aria-hidden="true" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-ink">{r.label}</span>
                    <span className="block text-[11px] text-ink-muted">{r.sub}</span>
                    {"help" in r && r.help && (
                      <span className="block text-[10px] text-ink-faint mt-0.5 leading-tight">{r.help}</span>
                    )}
                  </span>
                  <ChevronRight className="shrink-0 w-4 h-4 text-ink-faint" aria-hidden="true" />
                </button>
              ))}
              {g.more && hiddenCount > 0 && !toolSearch && (
                <button
                  onClick={() => toggleGroup(g.title)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-line hover:border-line-strong text-ink-muted hover:text-ink text-xs font-medium transition-all cursor-pointer min-h-[44px]"
                >
                  {isExpanded
                    ? "Show fewer"
                    : `${hiddenCount} more ${hiddenCount === 1 ? "tool" : "tools"}`}
                  <ChevronRight
                    className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-[-90deg]" : "rotate-90"}`}
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          </section>
        );
      })}

      {/* Empty state — with clear action */}
      {filteredGroups.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-ink-faint">
          <SearchX className="w-8 h-8" aria-hidden="true" />
          <p className="text-sm">No tools match</p>
          {(activeCategory !== "all" || toolSearch) && (
            <button
              onClick={clearFilters}
              className="text-xs text-accent hover:underline cursor-pointer min-h-[44px] flex items-center"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Crisis button — bottom thumb zone, always reachable */}
      <div className="flex justify-center pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        <CrisisHeaderButton onClick={onOpenCrisis} />
      </div>
    </div>
  );
}
