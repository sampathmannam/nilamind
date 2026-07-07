import React, { useState } from "react";
import { Mountain, Plus, X } from "lucide-react";
import { createHierarchy, addStep, removeStep, loadHierarchy, saveHierarchy, type ExposureHierarchy, type ExposureStep } from "../services/exposureHierarchy";

export default function ExposureHierarchyScreen() {
  const [hierarchy, setHierarchy] = useState<ExposureHierarchy | null>(loadHierarchy);
  const [stepText, setStepText] = useState("");
  const [suds, setSuds] = useState(50);
  const [title, setTitle] = useState("");

  function refresh() { setHierarchy(loadHierarchy()); }

  function handleCreate() {
    if (!title.trim()) return;
    const h = createHierarchy(title.trim());
    saveHierarchy(h);
    refresh();
    setTitle("");
  }

  function handleAddStep() {
    if (!hierarchy || !stepText.trim()) return;
    const updated = addStep(hierarchy, stepText.trim(), suds);
    saveHierarchy(updated);
    refresh();
    setStepText(""); setSuds(50);
  }

  function handleRemoveStep(stepId: string) {
    if (!hierarchy) return;
    const updated = removeStep(hierarchy, stepId);
    saveHierarchy(updated);
    refresh();
  }

  if (hierarchy) {
    const sorted = [...hierarchy.steps].sort((a, b) => a.suds - b.suds);
    return (
      <div className="space-y-4 max-w-md mx-auto" id="exposure-screen">
        <button onClick={() => { setHierarchy(null); }} className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 cursor-pointer" aria-label="Back">
          <X className="w-5 h-5" /> Close
        </button>
        <h2 className="text-lg font-semibold text-slate-100">{hierarchy.title}</h2>
        <p className="text-xs text-slate-400">Steps ranked by SUDS (0–100). Work from bottom up — start with the easiest.</p>

        <div className="space-y-2">
          {sorted.map((step, i) => (
            <div key={step.id} className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200">{step.description}</p>
                <p className="text-[10px] text-slate-500">SUDS: {step.suds}{step.completed ? " ✓ completed" : ""}</p>
              </div>
              {!step.completed && <button onClick={() => handleRemoveStep(step.id)} className="text-slate-600 hover:text-slate-400 cursor-pointer shrink-0"><X className="w-3 h-3" /></button>}
            </div>
          ))}
          {sorted.length === 0 && <p className="text-xs text-slate-500 text-center py-6">No steps yet. Add your first one below.</p>}
        </div>

        <div className="glass rounded-2xl p-3 space-y-2">
          <input value={stepText} onChange={(e) => setStepText(e.target.value)} placeholder="Exposure step..." className="w-full glass rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-500 shrink-0">SUDS: {suds}</label>
            <input type="range" min={0} max={100} value={suds} onChange={(e) => setSuds(+e.target.value)} className="flex-1" />
          </div>
          <button onClick={handleAddStep} className="w-full glass rounded-xl py-2 text-xs text-blue-300 cursor-pointer">Add step</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto" id="exposure-screen">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Mountain className="w-5 h-5 text-orange-400" /> Exposure Hierarchy</h2>
      <p className="text-xs text-slate-400 leading-relaxed">Build a ladder of fears. Work from the bottom up — start where it's easiest, not hardest.</p>

      <div className="glass rounded-2xl p-4 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hierarchy name (e.g. Social anxiety)" className="flex-1 glass rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500" />
        <button onClick={handleCreate} className="glass rounded-xl px-3 py-2 text-xs text-orange-300 cursor-pointer"><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
