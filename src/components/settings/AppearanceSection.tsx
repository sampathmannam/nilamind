import React, { useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "../../services/theme";

export default function AppearanceSection() {
  const [choice, setChoice] = useState<ThemeChoice>(getThemeChoice());
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
    </div>
  );
}
