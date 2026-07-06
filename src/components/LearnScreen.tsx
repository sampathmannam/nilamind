import React, { useState, useMemo } from "react";
import { BookOpen, Search, X, ChevronDown, LifeBuoy, AlertTriangle, FlaskConical, Heart } from "lucide-react";
import { searchLearn, type LearnResult, type LearnSource } from "../services/learnLibrary";
import { checkPsychoedQuery } from "../services/psychoed";
import { detectCrisis } from "../services/crisisClassifier";
import { getCrisisReply } from "../safety";
import { getSkill } from "../services/skillsLibrary";
import { PSYCHOED_TOPICS } from "../services/psychoed";
import { WHY_WE_BUILT_THIS } from "../data/whyWeBuiltThis";
import CrisisLines from "./CrisisLines";

// Unified reading library: one screen consuming searchLearn (Skills + Understand + Why).
// §9-gated: a crisis query surfaces help instead of library content. Pure, on-device; no model, no network.

const SOURCE_BADGE: Record<LearnSource, { label: string; cls: string }> = {
  skill: { label: "Skill", cls: "bg-blue-500/20 border-blue-500/50 text-blue-200" },
  understand: { label: "Explainer", cls: "bg-indigo-500/20 border-indigo-500/50 text-indigo-200" },
  why: { label: "Research", cls: "bg-slate-500/20 border-slate-500/50 text-slate-200" },
};

function lookupDetail(id: string, source: LearnSource): {
  steps?: string[];
  body?: string;
  basis?: string;
  emergencyCaveat?: string;
  what?: string;
  why?: string;
  research?: { citation: string; verified: boolean }[];
} | null {
  const raw = id.includes(":") ? id.split(":").slice(1).join(":") : id;
  if (source === "skill") {
    const s = getSkill(raw);
    return s ? { steps: s.steps, basis: s.basis } : null;
  }
  if (source === "understand") {
    const t = PSYCHOED_TOPICS.find((p) => p.id === raw);
    return t ? { body: t.body, basis: t.basis, emergencyCaveat: t.emergencyCaveat } : null;
  }
  if (source === "why") {
    const a = WHY_WE_BUILT_THIS.find((w) => w.id === raw);
    return a ? { what: a.what, why: a.why, research: a.research } : null;
  }
  return null;
}

export default function LearnScreen() {
  const [query, setQuery] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<LearnSource | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const allResults = useMemo(() => searchLearn(query), [query]);
  const results = useMemo(
    () => (sourceFilter ? allResults.filter((r) => r.source === sourceFilter) : allResults),
    [allResults, sourceFilter],
  );

  function onQueryChange(v: string) {
    if (checkPsychoedQuery(v)) { setCrisis(true); setQuery(""); return; }
    setQuery(v);
    if (v.trim()) void detectCrisis(v).then((c) => { if (c) { setCrisis(true); setQuery(""); } });
  }

  function needSupport() { setCrisis(true); setQuery(""); }

  const toggle = (id: string) =>
    setExpanded((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

  const counts = useMemo(() => {
    const c: Record<LearnSource, number> = { skill: 0, understand: 0, why: 0 };
    for (const r of allResults) c[r.source]++;
    return c;
  }, [allResults]);

  return (
    <div className="space-y-4 max-w-md mx-auto" id="learn-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" /> Learn
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Skills, explainers &amp; research — one library. A reference, not advice.
        </p>
      </header>

      {crisis ? (
        <div className="bg-card border border-rose-500/30 p-5 rounded-2xl space-y-3" id="learn-crisis">
          <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-1.5">
            <LifeBuoy className="w-4 h-4" /> You matter — support is here right now
          </h3>
          <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{getCrisisReply()}</p>
          <CrisisLines tone="rose" compact />
          <button onClick={() => setCrisis(false)} className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 cursor-pointer">
            I'm okay — back to reading
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={needSupport}
            id="learn-support"
            className="w-full flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl p-3.5 cursor-pointer text-left transition-colors"
          >
            <LifeBuoy className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-rose-200">Need support right now?</span>
          </button>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search skills, explainers & research…"
              id="learn-search"
              className="w-full glass rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer" aria-label="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSourceFilter(null)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${sourceFilter === null ? "bg-slate-200/20 border-slate-400/50 text-slate-100" : "bg-page border-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              All ({allResults.length})
            </button>
            {(["skill", "understand", "why"] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(sourceFilter === src ? null : src)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${sourceFilter === src ? SOURCE_BADGE[src].cls : "bg-page border-slate-800 text-slate-400 hover:text-slate-200"}`}
              >
                {SOURCE_BADGE[src].label} ({counts[src]})
              </button>
            ))}
          </div>

          <div className="space-y-2" id="learn-results">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">{results.length} result{results.length === 1 ? "" : "s"}</div>
            {results.length === 0 ? (
              <div className="glass rounded-2xl p-5 text-center text-xs text-slate-400">
                {query ? <>Nothing matches "{query}". Try a feeling, a skill name, or a topic.</> : "Loading library…"}
              </div>
            ) : (
              results.map((r) => <LearnCard key={r.id} result={r} open={expanded.has(r.id)} onToggle={() => toggle(r.id)} />)
            )}
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed px-4">
            Understanding can help — it isn't a substitute for professional care.
          </p>
        </>
      )}
    </div>
  );
}

function LearnCard({ result, open, onToggle }: { result: LearnResult; open: boolean; onToggle: () => void }) {
  const badge = SOURCE_BADGE[result.source];
  const detail = lookupDetail(result.id, result.source);

  return (
    <div className="glass border-l-4 border-l-blue-500 rounded-r-2xl overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer" aria-expanded={open}>
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-100">{result.title}</span>
            <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge.cls}`}>{badge.label}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{result.snippet}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && detail && (
        <div className="px-4 pb-4 -mt-1 space-y-3">
          {result.source === "skill" && detail.steps && (
            <ol className="space-y-1.5">
              {detail.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-blue-500 text-[9px] font-bold text-[#171311] flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          )}
          {result.source === "understand" && (
            <>
              {detail.emergencyCaveat && (
                <div className="flex gap-2 items-start bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-rose-200/90 leading-relaxed">{detail.emergencyCaveat}</p>
                </div>
              )}
              {detail.body && <p className="text-xs text-slate-300 leading-relaxed">{detail.body}</p>}
            </>
          )}
          {result.source === "why" && detail.what && (
            <div className="space-y-2 text-xs leading-relaxed">
              <p className="text-slate-300"><span className="text-slate-500 font-semibold">What it is — </span>{detail.what}</p>
              {detail.why && (
                <p className="text-slate-300 flex gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400/80 shrink-0 mt-0.5" />
                  <span><span className="text-slate-500 font-semibold">Why it helps — </span>{detail.why}</span>
                </p>
              )}
              {detail.research && detail.research.length > 0 && (
                <div className="border-t border-slate-800/70 pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <FlaskConical className="w-3 h-3" /> The research
                  </div>
                  {detail.research.map((r, i) => (
                    <p key={i} className="text-[11px] text-slate-400 leading-relaxed pl-1">
                      {r.citation}
                      {!r.verified && (
                        <span className="inline-flex items-center gap-1 ml-1 text-amber-300/90 font-medium" title="We're double-checking this reference's exact details.">
                          <AlertTriangle className="w-3 h-3" /> reference being verified
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          {detail.basis && <p className="text-[10px] text-slate-500 italic leading-relaxed border-t border-slate-800 pt-2">{detail.basis}</p>}
        </div>
      )}
    </div>
  );
}
