import { useState } from "react";
import { Mountain, Plus, X, CheckCircle } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { createHierarchy, addStep, removeStep, completeStep, loadHierarchy, saveHierarchy, completionRate, averageSudReduction, inhibitoryLearningPrompts, type ExposureHierarchy } from "../services/exposureHierarchy";
import { scanForCrisis } from "../safety";
import { hapticSuccess } from "../hooks/useHaptics";
import CrisisLines from "./CrisisLines";
import { suppressNudgesForCrisis } from "../services/notifications";

export default function ExposureHierarchyScreen() {
  const [hierarchy, setHierarchy] = useState<ExposureHierarchy | null>(loadHierarchy);
  const [stepText, setStepText] = useState("");
  const [suds, setSuds] = useState(50);
  const [title, setTitle] = useState("");
  const [completingStep, setCompletingStep] = useState<string | null>(null);
  const [postSuds, setPostSuds] = useState(50);
  const [learning, setLearning] = useState("");
  const [celebratedStep, setCelebratedStep] = useState<string | null>(null);
  // §9: a free-text field is a crisis-disclosure surface. If the input reads as crisis, we surface help
  // instead of treating it as an exposure — the deterministic gate, matching ReachOut/Psychoed.
  const [crisisShown, setCrisisShown] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  function refresh() { setHierarchy(loadHierarchy()); }

  function handleCreate() {
    const t = title.trim();
    if (!t) return;
    if (scanForCrisis(t)) { setCrisisShown(true); void suppressNudgesForCrisis(); return; }
    const h = createHierarchy(t);
    saveHierarchy(h);
    refresh();
    setTitle("");
  }

  function handleAddStep() {
    if (!hierarchy || !stepText.trim()) return;
    if (scanForCrisis(stepText.trim())) { setCrisisShown(true); void suppressNudgesForCrisis(); return; }
    const updated = addStep(hierarchy, stepText.trim(), suds);
    saveHierarchy(updated);
    refresh();
    setStepText(""); setSuds(50);
  }

  function handleRemoveStep(stepId: string) {
    setConfirmRemove(stepId);
  }
  function handleConfirmRemove() {
    if (!hierarchy || !confirmRemove) return;
    const updated = removeStep(hierarchy, confirmRemove);
    saveHierarchy(updated);
    setConfirmRemove(null);
    refresh();
  }

  function handleCompleteStep(stepId: string) {
    if (!hierarchy) return;
    const step = hierarchy.steps.find((s) => s.id === stepId);
    if (!step) return;
    const updated = completeStep(hierarchy, stepId, step.suds, postSuds, learning);
    saveHierarchy(updated);
    refresh();
    hapticSuccess();
    setCelebratedStep(step.description);
    setTimeout(() => setCelebratedStep(null), 3000);
    setCompletingStep(null); setPostSuds(50); setLearning("");
  }

  if (crisisShown) {
    return (
      <div className="space-y-4 max-w-md mx-auto" id="exposure-screen">
        <div className="bg-card border border-rose-500/40 p-5 rounded-2xl space-y-3" id="exposure-crisis">
          <h3 className="text-sm font-semibold text-rose-200">You matter — support is here right now</h3>
          <p className="text-base text-ink-2 leading-relaxed">
            What you just wrote sounds like more than an exposure step. This is a moment for a person, not an exercise —
            please reach out right now. You're not alone.
          </p>
          <CrisisLines tone="rose" />
        </div>
        <button onClick={() => setCrisisShown(false)} className="w-full glass rounded-xl py-2 text-xs text-ink-muted cursor-pointer">
          Back to the exercise
        </button>
      </div>
    );
  }

  if (hierarchy) {
    const sorted = [...hierarchy.steps].sort((a, b) => a.suds - b.suds);
    const rate = Math.round(completionRate(hierarchy) * 100);
    const sudReduction = averageSudReduction(hierarchy);

    return (
      <div className="space-y-4 max-w-md mx-auto" id="exposure-screen">
        <button onClick={() => { setHierarchy(null); }} className="flex items-center gap-1.5 text-ink-2 hover:text-white font-semibold py-3 px-1 -ml-1 cursor-pointer" aria-label="Back">
          <X className="w-5 h-5" /> Close
        </button>
        <h2 className="text-lg font-semibold text-ink">{hierarchy.title}</h2>
        <p className="text-base text-ink-muted">Steps ranked by SUDS (0–100). Work from bottom up — start with the easiest.</p>

        <div className="flex gap-4 text-center">
          <div className="glass rounded-xl p-3 flex-1">
            <div className="text-lg font-bold text-orange-300">{rate}%</div>
            <div className="text-xs text-ink-faint">Completed</div>
          </div>
          {sudReduction != null && (
            <div className="glass rounded-xl p-3 flex-1">
              <div className="text-lg font-bold text-accent-hi">-{Math.round(sudReduction)}</div>
              <div className="text-xs text-ink-faint">Avg SUDS drop</div>
            </div>
          )}
        </div>

        {/* Celebration message after step completion */}
        {celebratedStep && (
          <div className="glass rounded-2xl p-4 border-l-4 border-l-success flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-success shrink-0" />
            <p className="text-base text-ink-2 leading-relaxed">
              <span className="text-accent-hi font-semibold">Step completed</span> — {celebratedStep}.
              That takes courage, even when it's hard.
            </p>
          </div>
        )}

        {completingStep ? (
          <div className="glass rounded-2xl p-4 space-y-3 border-l-4 border-l-emerald-500">
            <div className="text-xs uppercase font-mono tracking-widest text-ink-faint">Complete this step</div>
            <div className="space-y-1">
              <label className="text-xs text-ink-faint">SUDS after exposure: {postSuds}</label>
              <input type="range" min={0} max={100} value={postSuds} onChange={(e) => setPostSuds(+e.target.value)} className="w-full" />
            </div>
            {/* Guided reflection: expectancy-violation prompts, the primary lever for durable exposure
                learning per Craske, Treanor, Conway, Zbozinek & Vervliet (2014) — previously built but unused. */}
            <div className="space-y-1.5">
              <div className="text-xs text-ink-faint">A few things worth reflecting on:</div>
              <ul className="space-y-1 list-disc list-inside">
                {inhibitoryLearningPrompts().map((prompt) => (
                  <li key={prompt} className="text-base text-ink-muted leading-relaxed">{prompt}</li>
                ))}
              </ul>
            </div>
            <textarea value={learning} onChange={(e) => setLearning(e.target.value)} placeholder="What did you learn? (optional)" rows={2} className="w-full glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-ink-faint" />
            <div className="flex gap-2">
              <button onClick={() => handleCompleteStep(completingStep)} className="flex-1 glass rounded-xl py-2 text-xs text-accent-hi cursor-pointer">Save</button>
              <button onClick={() => setCompletingStep(null)} className="glass rounded-xl px-3 py-2 text-xs text-ink-muted cursor-pointer">Cancel</button>
            </div>
            <p className="text-base text-ink-faint leading-relaxed">
              Reflection prompts based on the inhibitory-learning model (Craske, Treanor, Conway, Zbozinek &amp; Vervliet, 2014) —
              noticing what actually happened, versus what you predicted, is what research suggests makes exposure learning last.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((step, i) => (
              <div key={step.id} className={`glass rounded-xl p-3 flex items-center gap-3 ${step.completed ? "opacity-60" : ""}`}>
                <div className="w-8 h-8 rounded-full bg-fill flex items-center justify-center text-xs font-bold text-ink-muted shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-2">{step.description}</p>
                  <p className="text-xs text-ink-faint">
                    SUDS: {step.suds}
                    {step.completed && ` → ${step.postSuds} (completed)`}
                  </p>
                </div>
                {!step.completed && (
                  <button onClick={() => setCompletingStep(step.id)} className="text-xs text-accent-hi cursor-pointer shrink-0">Complete</button>
                )}
                {!step.completed && <button onClick={() => handleRemoveStep(step.id)} className="text-ink-faint hover:text-ink-muted cursor-pointer shrink-0"><X className="w-3 h-3" /></button>}
              </div>
            ))}
            {sorted.length === 0 && <p className="text-base text-ink-faint text-center py-6">No steps yet. Add your first one below.</p>}
          </div>
        )}

        {!completingStep && (
          <div className="glass rounded-2xl p-3 space-y-2">
            <input value={stepText} onChange={(e) => setStepText(e.target.value)} placeholder="Exposure step..." className="w-full glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-ink-faint" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-ink-faint shrink-0">SUDS: {suds}</label>
              <input type="range" min={0} max={100} value={suds} onChange={(e) => setSuds(+e.target.value)} className="flex-1" />
            </div>
            <button onClick={handleAddStep} className="w-full glass rounded-xl py-2 text-xs text-accent-hi cursor-pointer">Add step</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md mx-auto" id="exposure-screen">
      <h2 className="text-xl font-semibold text-ink flex items-center gap-2"><Mountain className="w-5 h-5 text-orange-400" /> Exposure Hierarchy</h2>
      <p className="text-base text-ink-muted leading-relaxed">Build a ladder of fears. Work from the bottom up — start where it's easiest, not hardest.</p>

      <div className="glass rounded-2xl p-4 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hierarchy name (e.g. Social anxiety)" className="flex-1 glass rounded-xl px-3 py-2 text-xs text-ink-2 placeholder-ink-faint" />
        <button onClick={handleCreate} aria-label="Add hierarchy" className="glass rounded-xl px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-orange-300 cursor-pointer"><Plus className="w-4 h-4" /></button>
      </div>

      <ConfirmDialog
        open={confirmRemove !== null}
        title="Remove step?"
        message="This step will be deleted from your hierarchy. Progress for this step will be lost."
        confirmLabel="Remove"
        cancelLabel="Keep"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmRemove(null)}
      />
    </div>
  );
}
