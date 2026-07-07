// GroundingInlineCard — compact 5-4-3-2-1 grounding exercise rendered inline in the stream.
// No navigation needed — the exercise activates right where Nila offered it.

import React, { useState } from "react";
import { Eye, Hand, Ear, Wind, Smile, ChevronRight, Check } from "lucide-react";

const STEPS = [
  { count: 5, sense: "see", icon: Eye, color: "text-emerald-400", prompt: "Name 5 things you can see" },
  { count: 4, sense: "touch", icon: Hand, color: "text-blue-400", prompt: "Name 4 things you can touch" },
  { count: 3, sense: "hear", icon: Ear, color: "text-violet-400", prompt: "Name 3 things you can hear" },
  { count: 2, sense: "smell", icon: Wind, color: "text-amber-400", prompt: "Name 2 things you can smell" },
  { count: 1, sense: "taste", icon: Smile, color: "text-rose-400", prompt: "Name 1 thing you can taste" },
];

interface GroundingInlineCardProps {
  onComplete?: () => void;
}

export default function GroundingInlineCard({ onComplete }: GroundingInlineCardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [itemsNamed, setItemsNamed] = useState<Record<number, number>>({});
  const [done, setDone] = useState(false);

  const step = STEPS[activeStep];
  const itemsForStep = itemsNamed[activeStep] ?? 0;
  const allNamed = itemsForStep >= step.count;

  const handleName = () => {
    setItemsNamed((prev) => ({ ...prev, [activeStep]: (prev[activeStep] ?? 0) + 1 }));
  };

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep((s) => s + 1);
    } else {
      setDone(true);
      onComplete?.();
    }
  };

  if (done) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-4 text-center" id="grounding-inline-done">
        <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-emerald-200">Grounding complete</p>
        <p className="text-xs text-emerald-300/70 mt-1">You've reconnected with your senses. How do you feel now?</p>
      </div>
    );
  }

  const Icon = step.icon;

  return (
    <div className="bg-page border border-emerald-500/25 rounded-2xl overflow-hidden" id="grounding-inline-card">
      {/* Progress dots */}
      <div className="flex gap-1.5 px-4 pt-3">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < activeStep ? "bg-emerald-400" : i === activeStep ? "bg-emerald-500" : "bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Current step */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <Icon className={`w-5 h-5 ${step.color} shrink-0`} />
          <div>
            <p className="text-xs text-slate-400">Step {activeStep + 1} of {STEPS.length}</p>
            <p className="text-sm font-semibold text-slate-100">{step.prompt}</p>
          </div>
        </div>

        {/* Name buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: step.count }).map((_, i) => (
            <button
              key={i}
              onClick={handleName}
              disabled={i < itemsForStep}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                i < itemsForStep
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700 hover:border-emerald-500/40 hover:text-emerald-300"
              }`}
            >
              {i < itemsForStep ? "✓" : `${i + 1}`}
            </button>
          ))}
        </div>

        {/* Next / Done button */}
        <button
          onClick={handleNext}
          disabled={!allNamed}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
            allNamed
              ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30"
              : "bg-slate-800 text-slate-500 border border-slate-700"
          }`}
        >
          {activeStep < STEPS.length - 1 ? (
            <>Next <ChevronRight className="w-4 h-4" /></>
          ) : (
            <>Complete <Check className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
