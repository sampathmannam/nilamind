import React, { useState, useMemo } from "react";
import { BookOpen, Search, X, ChevronDown, LifeBuoy, AlertTriangle } from "lucide-react";
import { searchPsychoed, checkPsychoedQuery, type PsychoedTopic } from "../services/psychoed";
import { getCrisisReply } from "../safety";
import CrisisLines from "./CrisisLines";

// "Understand" — a browsable, searchable psychoeducation library. Pure reading: no persistence, no model,
// no network. The search box is §9-gated (checkPsychoedQuery → scanForCrisis) BEFORE any lexical search,
// and a "Need support right now?" link is always available — both surface crisis help inline (same proven
// pattern as WindDownScreen). emergencyCaveat (panic / anxiety-body topics) renders always-visible + first.
export default function PsychoedScreen() {
  const [query, setQuery] = useState("");
  const [crisis, setCrisis] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const results = useMemo(() => searchPsychoed(query), [query]);

  // §9: gate BEFORE storing/searching — query never holds crisis text, lexical search never runs on it.
  function onQueryChange(v: string) {
    if (checkPsychoedQuery(v)) {
      setCrisis(true);
      setQuery("");
      return;
    }
    setQuery(v);
  }
  function needSupport() {
    setCrisis(true);
    setQuery("");
  }
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="space-y-4 max-w-md mx-auto" id="understand-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" /> Understand
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          Plain, research-backed explainers for how the mind and body work. A reference, not advice.
        </p>
      </header>

      {crisis ? (
        /* ── inline crisis surface (deterministic §9; query already cleared) ── */
        <div className="bg-card border border-rose-500/30 p-5 rounded-2xl space-y-3" id="understand-crisis">
          <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-1.5">
            <LifeBuoy className="w-4 h-4" /> You matter — support is here right now
          </h3>
          <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{getCrisisReply()}</p>
          <CrisisLines tone="rose" compact />
          <button
            onClick={() => setCrisis(false)}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 cursor-pointer"
          >
            I'm okay — back to reading
          </button>
        </div>
      ) : (
        <>
          {/* always-available route to support */}
          <button
            onClick={needSupport}
            id="understand-support"
            className="w-full flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl p-3.5 cursor-pointer text-left transition-colors"
          >
            <LifeBuoy className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="flex-1 min-w-0 text-[13px] font-semibold text-rose-200">Need support right now?</span>
          </button>

          {/* search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search (e.g. panic, can't sleep, overthinking)…"
              id="understand-search"
              className="w-full bg-card border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* results */}
          <div className="space-y-2" id="understand-results">
            <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
              {results.length} topic{results.length === 1 ? "" : "s"}
            </div>
            {results.length === 0 ? (
              <div className="bg-card border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-400">
                Nothing matches “{query}”. Try a feeling (panic, numb), a struggle (can't sleep, overthinking), or
                a word (avoidance, values).
              </div>
            ) : (
              results.map((t) => (
                <TopicCard key={t.id} topic={t} open={expanded.has(t.id)} onToggle={() => toggle(t.id)} />
              ))
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

function TopicCard({ topic, open, onToggle }: { topic: PsychoedTopic; open: boolean; onToggle: () => void }) {
  return (
    <div
      id={`topic-${topic.id}`}
      className="bg-card border border-slate-800 border-l-4 border-l-indigo-500 rounded-r-2xl overflow-hidden"
    >
      <button onClick={onToggle} className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer" aria-expanded={open}>
        <div className="min-w-0 space-y-1.5">
          <span className="block text-sm font-bold text-slate-100">{topic.title}</span>
          <p className="text-[11px] text-slate-400 leading-relaxed">{topic.summary}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* §9: emergency caveat is ALWAYS visible (collapsed + expanded), never hidden behind the toggle */}
      {topic.emergencyCaveat && (
        <div className="mx-4 mb-3 -mt-1 flex gap-2 items-start bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0 mt-0.5" />
          <p className="text-[10px] text-rose-200/90 leading-relaxed">{topic.emergencyCaveat}</p>
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 -mt-0.5 space-y-3">
          <p className="text-xs text-slate-300 leading-relaxed">{topic.body}</p>
          <p className="text-[10px] text-slate-500 italic leading-relaxed border-t border-slate-800 pt-2">{topic.basis}</p>
        </div>
      )}
    </div>
  );
}
