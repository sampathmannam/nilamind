import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { createEmptyPlan, loadRelapsePlan, saveRelapsePlan, currentPhase, phaseLabel, phaseDescription, signalFields, actionFields, type RelapsePlan, type PlanPhase } from "../services/relapsePlan";

const PHASES: PlanPhase[] = ["green", "orange", "red"];
const PHASE_COLORS: Record<PlanPhase, string> = { green: "border-emerald-500", orange: "border-amber-500", red: "border-rose-500" };
const PHASE_BG: Record<PlanPhase, string> = { green: "bg-emerald-500/10", orange: "bg-amber-500/10", red: "bg-rose-500/10" };

export default function RelapsePlanScreen() {
  const [plan, setPlan] = useState<RelapsePlan>(() => loadRelapsePlan() ?? createEmptyPlan());
  const [saved, setSaved] = useState(false);

  useEffect(() => { saveRelapsePlan(plan); }, [plan]);

  function updateSignal(phase: PlanPhase, key: string, value: string) {
    setPlan((p) => ({ ...p, [phase]: { ...p[phase], signals: { ...p[phase].signals, [key]: value } } }));
    flashSaved();
  }

  function updateActions(phase: PlanPhase, key: string, value: string) {
    setPlan((p) => ({ ...p, [phase]: { ...p[phase], actions: { ...p[phase].actions, [key]: value.split(",").map((s) => s.trim()).filter(Boolean) } } }));
    flashSaved();
  }

  function flashSaved() { setSaved(true); setTimeout(() => setSaved(false), 1200); }

  const phase = currentPhase(plan);
  const fields = signalFields();

  return (
    <div className="space-y-4 max-w-md mx-auto" id="relapse-plan-screen">
      <h2 className="text-xl font-semibold text-ink flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> Relapse Prevention Plan</h2>
      <p className="text-xs text-ink-muted leading-relaxed">Plan ahead for each phase: what to notice, what to do. Fill it in when you're feeling well so it's there when you need it.</p>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-ink-faint">Current phase:</span>
        <span className="font-semibold text-ink-2">{phaseLabel(phase)}</span>
        {saved && <span className="text-emerald-400 text-xs">✓ Saved</span>}
      </div>

      {PHASES.map((p) => (
        <div key={p} className={`glass rounded-2xl p-4 space-y-3 border-l-4 ${PHASE_COLORS[p]}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold text-ink ${p === phase ? "" : "text-ink-muted"}`}>{phaseLabel(p)}</span>
            {p === phase && <span className="text-xs font-mono uppercase tracking-wider bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">current</span>}
          </div>
          <p className="text-xs text-ink-faint">{phaseDescription(p)}</p>

          <div className="space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-ink-faint">Warning signs</div>
            {fields.map((f) => (
              <input key={f.key} value={plan[p].signals[f.key]} onChange={(e) => updateSignal(p, f.key, e.target.value)}
                placeholder={f.placeholder} className={`w-full glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-ink-faint ${p === phase ? PHASE_BG[p] : ""}`} />
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase font-mono tracking-widest text-ink-faint">Things I can do</div>
            {actionFields().map((f) => (
              <input key={f.key} value={plan[p].actions[f.key].join(", ")} onChange={(e) => updateActions(p, f.key, e.target.value)}
                placeholder={f.placeholder} className="w-full glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-ink-faint" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
