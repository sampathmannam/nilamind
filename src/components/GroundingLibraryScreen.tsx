import { useState, useEffect } from "react";
import { GROUNDING_EXERCISES } from "../data";
import BreathingTimer from "./BreathingTimer";
import TIPPTool from "./TIPPTool";

interface Props {
  /** 0-based index of the exercise to auto-expand on mount */
  autoExpand?: number;
}

export default function GroundingLibraryScreen({ autoExpand }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (autoExpand !== undefined) setExpandedIndex(autoExpand);
  }, [autoExpand]);

  const toggleExercise = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-4 max-w-md mx-auto px-4" id="grounding-library-screen">
      <div>
        <h1 className="text-xl font-semibold text-ink tracking-tight">Grounding Library</h1>
        <p className="text-xs text-ink-muted mt-1">6 somatic anchors — 100% offline-ready</p>
      </div>

      <div className="space-y-4">
        {GROUNDING_EXERCISES.map((ex, idx) => {
          const isExpanded = expandedIndex === idx;
          const isBoxBreathing = ex.title === "Box Breathing";
          // 2026-07-12 Wave 3, Group E: the unified interactive TIPP tool replaces this card's old
          // static paragraph (was a single shallow half-implementation of TIPP — see spec doc §3).
          const isTipp = ex.title === "Cold Reset (TIPP)";

          return (
            <div
              key={idx}
              className={`bg-card rounded-xl border transition-all overflow-hidden ${
                isExpanded ? "border-accent" : "border-line"
              }`}
              id={`grounding-card-${idx}`}
            >
              <button
                onClick={() => toggleExercise(idx)}
                className="w-full text-left p-4 focus:outline-none flex justify-between items-center cursor-pointer"
              >
                <div>
                  <h3 className="font-semibold text-base text-ink-2">{ex.title}</h3>
                  <p className="text-xs text-ink-faint mt-0.5">{ex.subtitle}</p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 bg-fill/50 rounded text-ink-muted border border-line/30">
                  {isExpanded ? "Close" : "Open"}
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-5 border-t border-line pt-4 space-y-4">
                  {!isTipp && (
                    <p className="text-sm text-ink-2 leading-relaxed whitespace-pre-wrap">
                      {ex.steps}
                    </p>
                  )}

                  {/* Interactive segment for Box Breathing */}
                  {isBoxBreathing && (
                    <div className="bg-page p-4 rounded-xl border border-line">
                      <BreathingTimer />
                    </div>
                  )}

                  {/* Interactive TIPP tool — consolidates the 3 shallow half-implementations into one. */}
                  {isTipp && (
                    <div className="bg-page p-4 rounded-xl border border-line">
                      <TIPPTool />
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-line/80">
                    <button
                      onClick={() => setExpandedIndex(null)}
                      className="glass hover:bg-raised text-slate-250 text-xs px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => setExpandedIndex(null)}
                      className="text-ink-faint hover:text-ink-2 text-xs px-4 py-2.5 font-medium transition-colors"
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
