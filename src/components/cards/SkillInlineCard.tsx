// SkillInlineCard — expandable skill card rendered inline.
// Shows skill name, purpose, and expandable steps. No navigation needed.

import React, { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Check } from "lucide-react";
import { SKILLS, type Skill } from "../../services/skillsLibrary";

interface SkillInlineCardProps {
  skillId: string;
  onComplete?: () => void;
}

export default function SkillInlineCard({ skillId, onComplete }: SkillInlineCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [completed, setCompleted] = useState(false);

  const skill = SKILLS.find((s) => s.id === skillId);
  if (!skill) {
    return (
      <div className="bg-page border border-blue-500/25 rounded-2xl p-4" id="skill-inline-not-found">
        <p className="text-sm text-slate-400">Skill not found</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-center" id="skill-inline-done">
        <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-emerald-200">Skill practiced</p>
        <p className="text-xs text-emerald-300/70 mt-1">How do you feel after trying {skill.name}?</p>
      </div>
    );
  }

  return (
    <div className="bg-page border border-blue-500/25 rounded-2xl overflow-hidden" id="skill-inline-card">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer"
      >
        <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-slate-100">
            {skill.name}
            {skill.acronym && <span className="text-xs text-slate-400 ml-2">({skill.acronym})</span>}
          </p>
          <p className="text-[11px] text-slate-400">{skill.modality} — {skill.purpose}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </button>

      {/* Expanded steps */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <div className="space-y-2">
            {skill.steps.map((step, i) => (
              <div key={i} className="flex gap-2 text-xs text-slate-300">
                <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 italic">{skill.basis}</p>
          <button
            onClick={() => { setCompleted(true); onComplete?.(); }}
            className="w-full py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors cursor-pointer"
          >
            I tried this
          </button>
        </div>
      )}
    </div>
  );
}
