import React, { useState } from "react";
import { Shield, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { DEFAULT_SCENARIOS, loadRehearsalLogs, saveRehearsalLog, type RehearsalScenario } from "../services/crisisRehearsal";

export default function CrisisRehearsalScreen() {
  const logs = loadRehearsalLogs();
  const [selected, setSelected] = useState<RehearsalScenario | null>(null);
  const [step, setStep] = useState(0);

  function startRehearsal(sc: RehearsalScenario) { setSelected(sc); setStep(0); }
  function nextStep() { if (selected && step < selected.steps.length - 1) setStep(step + 1); }
  function complete() {
    if (selected) {
      saveRehearsalLog({ scenarioId: selected.id, completedAt: new Date().toISOString(), completedSteps: selected.steps.length, totalSteps: selected.steps.length });
      setSelected(null); setStep(0);
    }
  }

  if (selected) {
    return (
      <div className="space-y-4 max-w-md mx-auto" id="crisis-rehearsal-screen">
        <button onClick={() => { setSelected(null); setStep(0); }} className="flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold py-3 px-1 -ml-1 cursor-pointer" aria-label="Back">
          <ChevronLeft className="w-5 h-5" /> All scenarios
        </button>
        <h2 className="text-lg font-semibold text-slate-100">{selected.title}</h2>
        <div className="text-xs text-slate-400">Step {step + 1} of {selected.steps.length}</div>
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-sm text-slate-200 leading-relaxed">{selected.steps[step]}</p>
        </div>
        <div className="flex gap-2">
          {step > 0 && <button onClick={() => setStep(step - 1)} className="flex-1 glass rounded-xl py-2 text-xs text-slate-400 cursor-pointer">Previous</button>}
          {step < selected.steps.length - 1
            ? <button onClick={nextStep} className="flex-1 glass rounded-xl py-2 text-xs text-blue-300 cursor-pointer">Next</button>
            : <button onClick={complete} className="flex-1 glass rounded-xl py-2 text-xs text-emerald-300 cursor-pointer flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</button>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto" id="crisis-rehearsal-screen">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Shield className="w-5 h-5 text-rose-400" /> Crisis Rehearsal</h2>
      <p className="text-xs text-slate-400 leading-relaxed">Practice your crisis plan in advance so it's easier to follow if you ever need it.</p>
      <div className="space-y-2">
        {DEFAULT_SCENARIOS.map((sc) => {
          const done = logs.some((l) => l.scenarioId === sc.id);
          return (
            <button key={sc.id} onClick={() => startRehearsal(sc)} className="w-full glass border-l-4 border-l-rose-500 rounded-r-2xl p-4 text-left cursor-pointer hover:border-rose-400/70 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">{sc.title}</span>
                {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{sc.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
