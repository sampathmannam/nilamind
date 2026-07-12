import React, { useState, useEffect } from "react";
import { Compass, Plus } from "lucide-react";
import { loadValuesWork, saveValuesWork, setValueImportance, setValueAlignment, topValues, alignmentGap, type ValueDomain } from "../services/valuesWork";

const PRESET_VALUES = ["Connection", "Learning", "Creativity", "Health", "Purpose", "Freedom", "Compassion", "Growth"];

export default function ValuesWorkScreen() {
  const [domains, setDomains] = useState<ValueDomain[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { setDomains(loadValuesWork()); }, []);

  function handleAddPreset(name: string) {
    const updated = [...domains, { id: `vw_${Date.now()}`, name, description: "", importance: 5, currentAlignment: 5, committedAction: "", completed: false, completedAt: null }];
    saveValuesWork(updated);
    setDomains(updated);
    setShowAdd(false);
  }

  function handleImportance(id: string, val: number) {
    const updated = setValueImportance(domains, id, val);
    saveValuesWork(updated);
    setDomains(updated);
  }

  function handleAlignment(id: string, val: number) {
    const updated = setValueAlignment(domains, id, val);
    saveValuesWork(updated);
    setDomains(updated);
  }

  const gaps = alignmentGap(domains);

  return (
    <div className="space-y-4 max-w-md mx-auto" id="values-work-screen">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Compass className="w-5 h-5 text-violet-400" /> Values Work</h2>
      <p className="text-xs text-slate-400 leading-relaxed">Clarify what matters most and notice where your actions align — or drift.</p>

      {gaps.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Alignment gaps</div>
          {gaps.slice(0, 3).map(({ domain, gap }) => (
            <div key={domain.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-200">{domain.name}</span>
              <span className="text-rose-400 font-mono">{gap > 0 ? `+${gap}` : gap}</span>
            </div>
          ))}
        </div>
      )}

      {showAdd ? (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="text-[10px] text-slate-500">Quick-add a value:</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_VALUES.filter((v) => !domains.some((d) => d.name === v)).map((v) => (
              <button key={v} onClick={() => handleAddPreset(v)} className="glass rounded-full px-3 py-1.5 text-[11px] text-violet-300 cursor-pointer hover:bg-violet-500/10">{v}</button>
            ))}
          </div>
          <button onClick={() => setShowAdd(false)} className="text-xs text-slate-500 cursor-pointer">Cancel</button>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full glass border-l-4 border-l-violet-500 rounded-r-2xl p-3 flex items-center gap-2 text-xs text-violet-300 cursor-pointer hover:border-violet-400/70 transition-colors">
          <Plus className="w-4 h-4" /> Add a value
        </button>
      )}

      <div className="space-y-2">
        {domains.map((v) => {
          const alignPct = Math.round((v.currentAlignment / 10) * 100);
          return (
            <div key={v.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">{v.name}</span>
                <span className="text-[10px] font-mono text-violet-300">{alignPct}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-violet-500/70 transition-all" style={{ width: `${alignPct}%` }} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">Importance: {v.importance}/10</label>
                <input type="range" min={1} max={10} value={v.importance} onChange={(e) => handleImportance(v.id, +e.target.value)} className="w-full" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500">Current alignment: {v.currentAlignment}/10</label>
                <input type="range" min={0} max={10} value={v.currentAlignment} onChange={(e) => handleAlignment(v.id, +e.target.value)} className="w-full" />
              </div>
            </div>
          );
        })}
        {domains.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No values added yet. Start by naming what matters.</p>}
      </div>

      {/* Honest basis + limit */}
      <p className="text-[10px] text-slate-500 leading-relaxed px-1">
        Self-compassion — treating yourself as you would a friend — may help when values work surfaces a gap
        (Ferrari, Hunt, Harrysunker, Abbott, Beath &amp; Einstein, 2019; Neff, 2003). This is a reflection aid,
        not therapy or a clinical measure.
      </p>
    </div>
  );
}
