import { useState } from "react";
import { ShieldAlert, Clock, MessageSquare, ChevronDown } from "lucide-react";
import { t as translate, tn as translateN, type I18nKey, type SupportedLang } from "../services/i18n";
import CollapsibleSection from "./CollapsibleSection";
import BandNarrative from "./BandNarrative";
import { SectionDivider } from "./Section";
import EmptyState from "./EmptyState";
import type { EpisodePatterns } from "../services/dashboardInsights";
import type { NilaTurn } from "../services/nilaSessions";

const MAX_PREVIEW = 5;

export interface EpisodesBandProps {
  openEpisodes: boolean;
  narrative: string;
  epPatterns: EpisodePatterns | null;
  nilaRecent: NilaTurn[];
  /** Stateful "Deep Evaluation" sub-feature stays owned by the dashboard (crisis-gated). */
  children?: React.ReactNode;
  t?: (key: I18nKey, lang?: SupportedLang) => string;
  lang?: SupportedLang;
}

/** The "Episodes & sessions" band: episode analytics and recent Nila sessions. The Deep Evaluation
 *  block is rendered as children because it owns dashboard-local state and the crisis surface. */
export default function EpisodesBand({
  openEpisodes,
  narrative,
  epPatterns,
  nilaRecent,
  children,
  t = translate,
  lang = "en",
}: EpisodesBandProps) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = nilaRecent.length > MAX_PREVIEW;
  const visible = expanded ? nilaRecent : nilaRecent.slice(0, MAX_PREVIEW);

  return (
    <CollapsibleSection title={t("episodes_sessions")} summary={t("episodes_summary")} defaultOpen={openEpisodes}>
      <BandNarrative text={narrative} />
      {(epPatterns || nilaRecent.length > 0) && (
        <SectionDivider label={t("episodes_sessions")} />
      )}

      {/* Episode analytics (real stats only — NO fabricated correlations) */}
      {epPatterns && (
        <div className="bg-card border-y border-r border-slate-800 border-l-4 border-l-amber-500 p-5 rounded-r-2xl space-y-4">
          <h2 className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> Episode insights
          </h2>
          <div className="grid grid-cols-2 gap-3" id="episode-stat-cards">
            <div className="bg-page p-3 rounded-xl border border-slate-850 text-center space-y-1">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-500">Peak spikes</span>
              <p className="text-2xl font-bold text-amber-500 capitalize flex items-center justify-center gap-1 font-mono">
                <Clock className="w-4 h-4 text-slate-500" /> {epPatterns.mostCommonTime || "Night"}
              </p>
            </div>
            <div className="bg-page p-3 rounded-xl border border-slate-850 text-center space-y-1">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-500">Avg duration</span>
              <p className="text-2xl font-bold text-purple-400 font-mono">{epPatterns.avgDuration} min</p>
            </div>
            <div className="bg-page col-span-2 p-3.5 rounded-xl border border-slate-850 text-center space-y-1">
              <span className="text-xs uppercase font-mono tracking-widest text-slate-500">Avg intensity drop per episode</span>
              <p className="text-base text-emerald-400 font-extrabold font-sans">{epPatterns.avgDrop} points</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Nila sessions */}
      {nilaRecent.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs uppercase font-mono tracking-widest text-slate-400 flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Recent Nila sessions</div>
          {visible.map((s) => (
            <div key={s.id} className="glass rounded-xl p-3 flex items-start justify-between gap-2">
              <span className="text-[11px] text-slate-300 italic min-w-0">"{s.snippet}{s.snippet.length >= 80 ? "…" : ""}"</span>
              <span className="text-xs text-slate-600 shrink-0">{s.surface === "episode" ? "episode" : "coach"} · {s.date.slice(5)}</span>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-400 bg-page rounded-xl border border-slate-850 hover:text-slate-200 hover:border-slate-700 transition-colors"
            >
              {expanded
                ? t("see_less", lang)
                : translateN("see_all_sessions", lang, { n: nilaRecent.length })}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      ) : (
        <EmptyState
          nilaState="greeting"
          title={t("no_sessions_title", lang)}
          body={t("no_sessions_yet", lang)}
        />
      )}

      {children}
    </CollapsibleSection>
  );
}
