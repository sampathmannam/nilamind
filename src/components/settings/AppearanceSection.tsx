import React, { useState } from "react";
import { Sun, Moon, Monitor, Leaf } from "lucide-react";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "../../services/theme";
import { useSensoryComfort } from "../../hooks/useSensoryComfort";

export default function AppearanceSection() {
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice());
  const [sensory, setSensory] = useSensoryComfort();
  const opts: { id: ThemeChoice; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "System", icon: <Monitor className="w-4 h-4" /> },
    { id: "light", label: "Light", icon: <Sun className="w-4 h-4" /> },
    { id: "dark", label: "Dark", icon: <Moon className="w-4 h-4" /> },
  ];
  const pick = (c: ThemeChoice) => { setChoice(c); setThemeChoice(c); };
  return (
    <div className="glass p-5 rounded-2xl space-y-3 shadow-lg" id="settings-appearance">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" /> Appearance
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Choose what's easiest on your eyes — there's no right answer, just what feels calmest for you.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
        {opts.map((o) => (
          <button
            key={o.id}
            onClick={() => pick(o.id)}
            id={`settings-theme-${o.id}`}
            role="radio"
            aria-checked={choice === o.id}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${choice === o.id ? "bg-blue-500/15 border-blue-500/50 text-blue-300" : "bg-page border-slate-800 text-slate-400 hover:border-slate-700"}`}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>

      <div className="border border-slate-800 rounded-xl p-3 flex items-center justify-between bg-page">
        <div className="flex items-center gap-2 min-w-0">
          <Leaf className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-slate-200">Soften visuals</div>
            <div className="text-[11px] text-slate-500 leading-tight">Calm mode — stills motion and dims bright surfaces if they ever feel like too much.</div>
          </div>
        </div>
        <button
          onClick={() => setSensory(!sensory)}
          role="switch"
          aria-checked={sensory}
          id="settings-sensory-comfort"
          className={`shrink-0 w-11 h-6 rounded-full transition-colors cursor-pointer ${sensory ? "bg-emerald-500" : "bg-slate-700"}`}
        >
          <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${sensory ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>
    </div>
  );
}
