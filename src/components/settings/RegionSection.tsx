import React, { useState } from "react";
import { t } from "../../services/i18n";
import { Globe2 } from "lucide-react";
import { allRegions, getRegionCode, setRegionCode, getCrisisLines, type RegionCode } from "../../services/crisisResources";

// 2026-07-12 device-QA (F12): CrisisOverlay and onboarding both promise "change in Settings" but no such
// control existed — a non-India user was stuck seeing India-only helplines. crisisResources.ts (the
// service layer) was already built + tested; this is the missing UI section.
export default function RegionSection() {
  const [code, setCode] = useState<RegionCode>(getRegionCode());

  const handleChange = (next: RegionCode) => {
    setRegionCode(next);
    setCode(next);
  };

  const lines = getCrisisLines();

  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="region-section">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-blue-400" /> {t("sec_region")}
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          These are the helplines shown if you ever need them.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="region-select" className="block text-xs font-medium text-slate-300">
          Region
        </label>
        <select
          id="region-select"
          aria-label="Region"
          value={code}
          onChange={(e) => handleChange(e.target.value as RegionCode)}
          className="w-full px-3 py-2.5 rounded-xl border text-sm bg-page border-slate-800 text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {allRegions().map((r) => (
            <option key={r.code} value={r.code}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="border border-slate-800 rounded-xl p-3 bg-page space-y-2" id="region-preview-lines">
        {lines.map((line) => (
          <div key={line.name} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-slate-300">{line.name}</span>
            <span className="text-slate-400 text-[11px] text-right">{line.display}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
