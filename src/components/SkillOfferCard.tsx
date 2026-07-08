// SkillOfferCard — in-chat suggestion card for evidence-based coping skills.
// Surfaces a relevant skill when the user expresses distress. One-tap to get the skill's steps.

import React from "react";
import { Sparkles } from "lucide-react";
import type { Skill } from "../services/skillsLibrary";

interface Props {
  skill: Skill;
  reason: string;
  emoji: string;
  onTry: (skill: Skill) => void;
  onDismiss: () => void;
}

export default function SkillOfferCard({ skill, reason, emoji, onTry, onDismiss }: Props) {
  return (
    <div className="w-full max-w-sm bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3 space-y-2" id="skill-offer-card">
      <div className="flex items-start gap-2">
        <span className="text-lg">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-blue-300 font-semibold">{reason}</p>
          <p className="text-sm text-slate-200 font-medium mt-0.5">{skill.name}</p>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1 line-clamp-2">
            {skill.purpose}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onTry(skill)}
          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3 h-3" /> Try this skill
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors cursor-pointer"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
