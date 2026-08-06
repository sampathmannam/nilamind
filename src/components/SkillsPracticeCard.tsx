import React from "react";
import { Swords } from "lucide-react";
import { computeInsight } from "../services/skillsPractice";
import { t, tn, useLanguage } from "../services/i18n";

/** Compact Dashboard card showing DBT skills practice summary. */
function SkillsPracticeCard({ onOpen }: { onOpen: () => void }) {
  const lang = useLanguage();
  const insight = computeInsight();

  if (insight.totalPractices === 0) return null;

  const topSkill = Object.entries(insight.skillCounts)
    .sort(([, a], [, b]) => b - a)[0];

  const topHelped = Object.entries(insight.skillHelpedRates)
    .sort(([, a], [, b]) => b - a)[0];

  const balanceNote =
    insight.familyBalance === "crisis_dominant"
      ? t("skp_crisisDominant")
      : insight.familyBalance === "balanced"
        ? t("skp_balanced")
        : null;

  return (
    <button
      onClick={onOpen}
      id="dashboard-skills-practice-card"
      className="w-full glass hover:brightness-125 hover:bg-raised p-4 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3"
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-bold text-ink">{t("skp_title")}</span>
        </div>
        <p className="text-[11px] text-ink-muted">
          <span className="font-semibold text-ink-2">{insight.totalPractices}</span> {t("skp_practices")}
          {topSkill && (
            <> · {t("skp_mostUsed")} <span className="font-semibold text-ink-2">{topSkill[0]}</span></>
          )}
        </p>
        {topHelped && (
          <p className="text-[11px] text-success font-medium">
            {tn("skp_helpedPct", lang, { skill: topHelped[0], pct: Math.round(topHelped[1] * 100) })}
          </p>
        )}
        {balanceNote && (
          <p className="text-[11px] text-ink-faint italic">{balanceNote}</p>
        )}
      </div>
      <Swords className={`w-5 h-5 ${insight.totalPractices > 0 ? "text-sky-300" : "text-slate-600"}`} />
    </button>
  );
}

export default React.memo(SkillsPracticeCard);
