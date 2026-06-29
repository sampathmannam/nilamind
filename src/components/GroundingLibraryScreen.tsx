import React, { useState, useEffect, useRef } from "react";
import { GROUNDING_EXERCISES } from "../data";
import { Play, Pause, RefreshCw, Disc } from "lucide-react";

export default function GroundingLibraryScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  
  // Box breathing states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [breathPhase, setBreathPhase] = useState<"In" | "Hold1" | "Out" | "Hold2">("In");
  const [breathCount, setBreathCount] = useState<number>(1);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check for client-side prefers-reduced-motion
  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(isReduced);
  }, []);

  // Breathing loop effects
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setBreathCount((prev) => {
          if (prev >= 4) {
            // Transist to next phase
            setBreathPhase((phase) => {
              switch (phase) {
                case "In": return "Hold1";
                case "Hold1": return "Out";
                case "Out": return "Hold2";
                case "Hold2": return "In";
                default: return "In";
              }
            });
            return 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying]);

  const toggleExercise = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
      setIsPlaying(false);
    } else {
      setExpandedIndex(index);
      setIsPlaying(false);
      setBreathPhase("In");
      setBreathCount(1);
    }
  };

  const getBreathLabel = () => {
    switch (breathPhase) {
      case "In": return "Breathe In";
      case "Hold1": return "Hold Breath";
      case "Out": return "Breathe Out";
      case "Hold2": return "Hold Breath";
    }
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
                    <div className="bg-page p-4 rounded-xl border border-slate-800 flex flex-col items-center gap-4">
                      {/* Interactive breathing visuals */}
                      <div className="relative w-40 h-40 flex items-center justify-center">
                        {/* Interactive breathing ball */}
                        {!reducedMotion && (
                          <div
                            className={`absolute rounded-full bg-emerald-500/10 border border-emerald-500/40 transition-all duration-1000 ${
                              isPlaying
                                ? breathPhase === "In"
                                  ? "w-36 h-36 bg-emerald-500/15"
                                  : breathPhase === "Hold1"
                                  ? "w-36 h-36 bg-amber-500/15 border-amber-500/40"
                                  : breathPhase === "Out"
                                  ? "w-16 h-16 bg-blue-500/15 border-blue-500/40"
                                  : "w-16 h-16 bg-slate-500/15 border-slate-500/40"
                                : "w-24 h-24"
                            }`}
                          />
                        )}

                        {/* Text labels inside indicator ball */}
                        <div className="z-10 text-center">
                          <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">
                            {isPlaying ? getBreathLabel() : "Ready"}
                          </p>
                          <p className="text-3xl font-black font-mono text-slate-100 mt-1">
                            {isPlaying ? breathCount : "0"}
                          </p>
                        </div>
                      </div>

                      {/* Controls Row */}
                      <div className="w-full flex justify-center gap-4">
                        <button
                          onClick={() => setIsPlaying(!isPlaying)}
                          className="flex items-center gap-2 bg-card hover:bg-raised border border-slate-800 text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer"
                        >
                          {isPlaying ? (
                            <>
                              <Pause className="w-4 h-4 text-amber-400" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 text-emerald-400" /> Run Guide
                            </>
                          )}
                        </button>

                        <button
                          aria-label="Reset breathing exercise"
                          onClick={() => {
                            setIsPlaying(false);
                            setBreathPhase("In");
                            setBreathCount(1);
                          }}
                          className="flex items-center gap-1 bg-card hover:bg-raised border border-slate-800 px-3 py-2.5 rounded-lg text-sm text-slate-500 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Manual configuration options */}
                      <label className="flex items-center gap-2 text-xs text-slate-500 mt-2 select-none">
                        <input
                          type="checkbox"
                          checked={reducedMotion}
                          onChange={(e) => setReducedMotion(e.target.checked)}
                          className="accent-emerald-500"
                        />
                        <span>Reduced motion (show count numbers only)</span>
                      </label>
                    </div>
                  )}

                  {/* Actions footer */}
                  <div className="flex gap-2 justify-end pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => setExpandedIndex(null)}
                      className="bg-card border border-slate-800 hover:bg-raised text-slate-250 text-xs px-4 py-2.5 rounded-lg font-medium transition-all cursor-pointer"
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
