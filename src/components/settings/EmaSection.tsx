import React, { useState } from "react";
import { Bell } from "lucide-react";
import { getEmaEnabled, setEmaEnabled, getEmaFrequency, setEmaFrequency } from "../../services/emaPrefs";

const FREQ_OPTIONS = [1, 2, 3] as const;

export default function EmaSection() {
  const [enabled, setEnabled] = useState(getEmaEnabled());
  const [freq, setFreq] = useState(getEmaFrequency());
  const toggle = () => { const next = !enabled; setEnabled(next); setEmaEnabled(next); };
  const setFreqVal = (v: number) => { setFreq(v); setEmaFrequency(v); };
  return (
    <div className="glass p-5 rounded-2xl space-y-4 shadow-lg" id="settings-ema">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Bell className="w-4 h-4 text-purple-400" /> Quick Check-ins
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Micro-check-ins throughout the day (&lt;10s each). Helps capture mood shifts that a single daily
          check-in might miss. Random within your chosen windows.
        </p>
      </div>
      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="text-sm font-medium text-slate-200">Quick check-ins on</div>
        <button
          onClick={toggle}
          id="settings-ema-toggle"
          className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${enabled ? "bg-purple-500" : "bg-slate-700"}`}
          role="switch" aria-checked={enabled}
        >
          <span aria-hidden="true" className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${enabled ? "translate-x-2.5" : "-translate-x-2.5"}`} />
        </button>
      </div>
      {enabled && (
        <div className="border border-slate-800 rounded-xl p-3 bg-page">
          <div className="text-xs text-slate-400 mb-2">Check-ins per day</div>
          <div className="flex gap-2">
            {FREQ_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setFreqVal(n)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  freq === n
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-500"
                }`}
              >
                {n}x/day
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
