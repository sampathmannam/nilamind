// ThoughtRecordInlineCard — compact 3-step CBT thought record rendered inline.
// Step 1: What happened? (feeling)
// Step 2: What's the thinking trap? (select from list)
// Step 3: Balanced thought (Nila can help)
// Zero navigation needed — the exercise activates right where Nila offered it.

import React, { useState } from "react";
import { ChevronRight, Check, BrainCircuit } from "lucide-react";
import { fetchBalancedThought } from "../../services/coachAssist";

const TRAPS = [
  "All-or-Nothing",
  "Catastrophising",
  "Mind-Reading",
  "Fortune-Telling",
  "Emotional Reasoning",
  "Should Statements",
  "Labelling",
  "Personalisation",
  "Mental Filter",
  "Magnification",
];

interface ThoughtRecordInlineCardProps {
  onComplete?: () => void;
  initialFeeling?: string;
}

export default function ThoughtRecordInlineCard({ onComplete, initialFeeling }: ThoughtRecordInlineCardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [feeling, setFeeling] = useState(initialFeeling ?? "");
  const [selectedTraps, setSelectedTraps] = useState<string[]>([]);
  const [balancedThought, setBalancedThought] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggleTrap = (trap: string) => {
    setSelectedTraps((prev) => prev.includes(trap) ? prev.filter((t) => t !== trap) : [...prev, trap]);
  };

  const handleAiHelp = async () => {
    if (!feeling) return;
    setAiLoading(true);
    try {
      const result = await fetchBalancedThought({
        situation: feeling,
        feeling: "",
        automaticThought: feeling,
        beliefPercent: 50,
        selectedTraps,
      });
      if (!result.crisis && result.reply) {
        setBalancedThought(result.reply);
      }
    } catch { /* ignore */ }
    setAiLoading(false);
  };

  const handleComplete = () => {
    setDone(true);
    onComplete?.();
  };

  if (done) {
    return (
      <div className="bg-violet-500/10 border border-violet-500/25 rounded-2xl p-4 text-center" id="thought-record-inline-done">
        <Check className="w-6 h-6 text-violet-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-violet-200">Thought recorded</p>
        <p className="text-xs text-violet-300/70 mt-1">You've reframed this thought. How do you feel now?</p>
      </div>
    );
  }

  return (
    <div className="bg-page border border-violet-500/25 rounded-2xl overflow-hidden" id="thought-record-inline-card">
      {/* Progress */}
      <div className="flex gap-1.5 px-4 pt-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-violet-400" : "bg-slate-700"}`} />
        ))}
      </div>

      <div className="px-4 py-4">
        {step === 1 && (
          <>
            <p className="text-sm font-semibold text-slate-100 mb-1">What happened?</p>
            <p className="text-xs text-slate-400 mb-3">Describe the situation or feeling</p>
            <textarea
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
              rows={3}
              placeholder="I feel overwhelmed because..."
              className="w-full text-sm glass rounded-xl p-3 text-slate-200 focus:outline-none focus:border-violet-500 resize-none"
            />
            <button
              onClick={() => setStep(2)}
              disabled={!feeling.trim()}
              className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                feeling.trim()
                  ? "bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 border border-violet-500/30"
                  : "bg-slate-800 text-slate-500 border border-slate-700"
              }`}
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm font-semibold text-slate-100 mb-1">Thinking traps?</p>
            <p className="text-xs text-slate-400 mb-3">Which thinking patterns apply?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {TRAPS.map((trap) => (
                <button
                  key={trap}
                  onClick={() => toggleTrap(trap)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    selectedTraps.includes(trap)
                      ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-violet-500/40"
                  }`}
                >
                  {trap}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(3)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 border border-violet-500/30 transition-colors cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm font-semibold text-slate-100 mb-1">Balanced thought</p>
            <p className="text-xs text-slate-400 mb-3">What's a more balanced perspective?</p>
            <textarea
              value={balancedThought}
              onChange={(e) => setBalancedThought(e.target.value)}
              rows={3}
              placeholder="A more balanced way to look at this is..."
              className="w-full text-sm glass rounded-xl p-3 text-slate-200 focus:outline-none focus:border-violet-500 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAiHelp}
                disabled={aiLoading || !feeling.trim()}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 border border-violet-500/20 transition-colors cursor-pointer"
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                {aiLoading ? "Thinking..." : "Ask Nila to help"}
              </button>
              <button
                onClick={handleComplete}
                disabled={!balancedThought.trim()}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  balancedThought.trim()
                    ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                <Check className="w-4 h-4" /> Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
