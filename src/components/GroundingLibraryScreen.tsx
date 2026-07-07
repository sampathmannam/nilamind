import React, { useState } from "react";
import { GROUNDING_EXERCISES } from "../data";
import BreathingTimer from "./BreathingTimer";

export default function GroundingLibraryScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExercise = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto" id="grounding-library-screen">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Grounding Library</h1>
        <p className="text-xs text-slate-500">6 somatic anchors - 100% offline-ready</p>
      </div>

      <div className="space-y-4">
        {GROUNDING_EXERCISES.map((ex, idx) => {
          const isExpanded = expandedIndex === idx;
          const isBoxBreathing = ex.title === "Box Breathing";

          return (
            <div
              key={idx}
              className={`bg-card rounded-xl border transition-all overflow-hidden ${
                isExpanded ? "border-blue-500" : "border-slate-800"
              }`}
              id={`grounding-card-${idx}`}
            >
              <button
                onClick={() => toggleExercise(idx)}
                className="w-full text-left p-4 focus:outline-none flex justify-between items-center cursor-pointer"
              >
                <div>
                  <h3 className="font-semibold text-base text-slate-200">{ex.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{ex.subtitle}</p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 bg-slate-800/50 rounded text-slate-400 border border-slate-800/30">
                  {isExpanded ? "Close" : "Open"}
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-5 border-t border-slate-800/80 pt-4 space-y-4">
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {ex.steps}
                  </p>

                  {/* Interactive segment for Box Breathing */}
                  {isBoxBreathing && (
                    <div className="bg-page p-4 rounded-xl border border-slate-800">
                      <BreathingTimer />
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => setExpandedIndex(null)}
                      className="glass hover:bg-raised text-slate-250 text-xs px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => setExpandedIndex(null)}
                      className="text-slate-500 hover:text-slate-200 text-xs px-4 py-2.5 font-medium transition-colors"
                    >
                      Take a break
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
