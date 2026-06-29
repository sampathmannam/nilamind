import React, { useState, useMemo, useEffect } from "react";
import { BookOpen, Search, ChevronDown, X, LifeBuoy, Sparkles, ChevronRight } from "lucide-react";
import { SKILLS, SKILL_GROUPS, groupMeta, skillForEmotion, type Skill } from "../services/skillsLibrary";
import { searchSkills } from "../services/skillRetrieval";
import { secureLocal } from "../services/secureLocal";

// Static class strings per group tone (Tailwind scans source — no dynamic class names).
const TONE: Record<string, { chipOn: string; text: string; border: string; dot: string }> = {
  rose: { chipOn: "bg-rose-500/20 border-rose-500/50 text-rose-200", text: "text-rose-300", border: "border-l-rose-500", dot: "bg-rose-500" },
  sky: { chipOn: "bg-sky-500/20 border-sky-500/50 text-sky-200", text: "text-sky-300", border: "border-l-sky-500", dot: "bg-sky-500" },
  amber: { chipOn: "bg-amber-500/20 border-amber-500/50 text-amber-200", text: "text-amber-300", border: "border-l-amber-500", dot: "bg-amber-500" },
  blue: { chipOn: "bg-blue-500/20 border-blue-500/50 text-blue-200", text: "text-blue-300", border: "border-l-blue-500", dot: "bg-blue-500" },
  violet: { chipOn: "bg-violet-500/20 border-violet-500/50 text-violet-200", text: "text-violet-300", border: "border-l-violet-500", dot: "bg-violet-500" },
  emerald: { chipOn: "bg-emerald-500/20 border-emerald-500/50 text-emerald-200", text: "text-emerald-300", border: "border-l-emerald-500", dot: "bg-emerald-500" },
  purple: { chipOn: "bg-purple-500/20 border-purple-500/50 text-purple-200", text: "text-purple-300", border: "border-l-purple-500", dot: "bg-purple-500" },
};

export default function SkillsLibraryScreen({ focusSkillId }: { focusSkillId?: string } = {}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  // When opened from a Nila recommendation, pre-expand that skill and scroll to it.
  const [expanded, setExpanded] = useState<Set<string>>(() => (focusSkillId ? new Set([focusSkillId]) : new Set()));

  const results = useMemo(() => searchSkills(query, group), [query, group]);

  useEffect(() => {
    if (!focusSkillId) return;
    const el = document.getElementById(`skill-${focusSkillId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSkillId]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Gentle recommendation from the most recent check-in emotion (dismissable). Read in an effect
  // (after mount) so the encrypted store is reliably hydrated before we read it.
  const [recommended, setRecommended] = useState<Skill | null>(null);
  const [dismissedRec, setDismissedRec] = useState(false);
  useEffect(() => {
    try {
      const raw = secureLocal.getItem("nilamind_checkins");
      const arr = raw ? JSON.parse(raw) : [];
      const last = Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null;
      if (last?.emotion) {
        const emo = String(last.emotion).replace(/\s*\([^)]*\)\s*$/, "").trim(); // strip "(Quick)" etc.
        setRecommended(skillForEmotion(emo));
      }
    } catch { /* */ }
  }, []);

  const openSkill = (id: string) => {
    setQuery(""); setGroup(null);
    setExpanded((prev) => new Set(prev).add(id));
    setTimeout(() => document.getElementById(`skill-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  };
  const inHardMoment = () => {
    setQuery(""); setGroup("crisis");
    setTimeout(() => document.getElementById("skills-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <div className="space-y-4 max-w-md mx-auto" id="skills-library-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-400" /> Skills Library
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">
          {SKILLS.length} evidence-based skills from DBT, CBT, ACT &amp; CFT — what to do, and why it
          works. A reference, not advice.
        </p>
      </header>

      {/* In a hard moment — one tap to the get-through-it (distress tolerance) skills */}
      <button
        onClick={inHardMoment}
        id="skills-hard-moment"
        className="w-full flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 hover:border-rose-500/50 rounded-2xl p-4 cursor-pointer text-left transition-colors"
      >
        <LifeBuoy className="w-5 h-5 text-rose-400 shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-rose-200">In a hard moment right now?</span>
          <span className="block text-[11px] text-rose-300/80">Jump to the get-through-it skills</span>
        </span>
        <ChevronRight className="w-5 h-5 text-rose-400/70 shrink-0" />
      </button>

      {/* Gentle, dismissable recommendation based on the most recent check-in */}
      {recommended && !dismissedRec && (
        <div className="bg-card border border-blue-500/30 rounded-2xl p-4 space-y-2.5" id="skills-recommended">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-blue-300 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> For how you've been feeling</span>
            <button onClick={() => setDismissedRec(true)} aria-label="Dismiss recommendation" className="flex items-center justify-center w-8 h-8 -m-1.5 text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={() => openSkill(recommended.id)} className="w-full flex items-center gap-3 text-left cursor-pointer" id="skills-rec-open">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-100">{recommended.name}</span>
              <span className="block text-[11px] text-slate-400 leading-snug">{recommended.purpose}</span>
            </span>
            <ChevronRight className="w-5 h-5 text-blue-400 shrink-0" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills (e.g. urge, sleep, breathe, DEAR MAN)…"
          id="skills-search"
          className="w-full bg-card border border-slate-800 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer" aria-label="Clear search">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Group filter chips */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setGroup(null)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${group === null ? "bg-slate-200/20 border-slate-400/50 text-slate-100" : "bg-page border-slate-800 text-slate-400 hover:text-slate-200"}`}
        >
          All
        </button>
        {SKILL_GROUPS.map((g) => {
          const on = group === g.id;
          return (
            <button
              key={g.id}
              id={`skills-group-${g.id}`}
              onClick={() => setGroup(on ? null : g.id)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${on ? TONE[g.tone].chipOn : "bg-page border-slate-800 text-slate-400 hover:text-slate-200"}`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {group && <p className="text-[11px] text-slate-500 italic -mt-1">{groupMeta(group).blurb}</p>}

      {/* Results */}
      <div className="space-y-2" id="skills-results">
        <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">{results.length} skill{results.length === 1 ? "" : "s"}</div>
        {results.length === 0 ? (
          <div className="bg-card border border-slate-800 rounded-2xl p-5 text-center text-xs text-slate-400">
            No skills match “{query}”. Try a feeling (shame, panic), an action (breathe, say no), or a method (DBT, ACT).
          </div>
        ) : (
          results.map((s) => <SkillCard key={s.id} skill={s} open={expanded.has(s.id)} onToggle={() => toggle(s.id)} />)
        )}
      </div>
    </div>
  );
}

function SkillCard({ skill, open, onToggle }: { skill: Skill; open: boolean; onToggle: () => void }) {
  const tone = TONE[groupMeta(skill.group).tone];
  return (
    <div id={`skill-${skill.id}`} className={`bg-card border border-slate-800 border-l-4 ${tone.border} rounded-r-2xl overflow-hidden scroll-mt-4`}>
      <button onClick={onToggle} className="w-full text-left p-4 flex items-start justify-between gap-3 cursor-pointer" aria-expanded={open}>
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-100">{skill.name}</span>
            <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${tone.text} bg-page border border-slate-800`}>{skill.modality}</span>
          </div>
          {skill.acronym && <p className="text-[10px] text-slate-500 leading-snug">{skill.acronym}</p>}
          <p className="text-[11px] text-slate-400 leading-relaxed">{skill.purpose}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 mt-0.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 -mt-1 space-y-3">
          <ol className="space-y-1.5">
            {skill.steps.map((step, i) => (
              <li key={i} className="flex gap-2 text-xs text-slate-300 leading-relaxed">
                <span className={`shrink-0 w-4 h-4 rounded-full ${tone.dot} text-[9px] font-bold text-[#171311] flex items-center justify-center mt-0.5`}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-slate-500 italic leading-relaxed border-t border-slate-800 pt-2">{skill.basis}</p>
        </div>
      )}
    </div>
  );
}
