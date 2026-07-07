// WindDownInlineCard — compact wind-down routine rendered inline.
// Park the day → breathing → done. Zero navigation needed.

import React, { useState, useEffect, useRef } from "react";
import { Moon, Wind, Play, Pause, RotateCcw, Check } from "lucide-react";

type Stage = "park" | "breathe" | "done";

interface WindDownInlineCardProps {
  onComplete?: () => void;
}

export default function WindDownInlineCard({ onComplete }: WindDownInlineCardProps) {
  const [stage, setStage] = useState<Stage>("park");
  const [worry, setWorry] = useState("");

  // Breathing state (4 in / 6 out)
  const [breathing, setBreathing] = useState(false);
  const [phase, setPhase] = useState<"In" | "Out">("In");
  const [count, setCount] = useState(1);
  const [cyclesDone, setCyclesDone] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (breathing) {
      timer.current = setInterval(() => {
        setCount((prev) => {
          const limit = phase === "In" ? 4 : 6;
          if (prev >= limit) {
            setPhase((p) => (p === "In" ? "Out" : "In"));
            if (phase === "Out") {
              setCyclesDone((c) => {
                if (c + 1 >= 4) {
                  setBreathing(false);
                  setStage("done");
                  onComplete?.();
                }
                return c + 1;
              });
            }
            return 1;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [breathing, phase]);

  const handlePark = () => {
    setWorry("");
    setStage("breathe");
  };

  const handleReset = () => {
    setBreathing(false);
    setPhase("In");
    setCount(1);
    setCyclesDone(0);
    setStage("park");
  };

  if (stage === "done") {
    return (
      <div className="bg-indigo-500/10 border border-indigo-500/25 rounded-2xl p-4 text-center" id="winddown-inline-done">
        <Check className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-indigo-200">Wind-down complete</p>
        <p className="text-xs text-indigo-300/70 mt-1">You've set the day aside. Sleep well.</p>
      </div>
    );
  }

  return (
    <div className="bg-page border border-indigo-500/25 rounded-2xl p-4" id="winddown-inline-card">
      {stage === "park" && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
            <p className="text-sm font-semibold text-slate-100">Park the day</p>
          </div>
          <p className="text-xs text-slate-400 mb-3">Write down anything on your mind, then let it go.</p>
          <textarea
            value={worry}
            onChange={(e) => setWorry(e.target.value)}
            rows={2}
            placeholder="What's on your mind..."
            className="w-full text-sm glass rounded-xl p-3 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none mb-3"
          />
          <button
            onClick={handlePark}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors cursor-pointer"
          >
            <Wind className="w-4 h-4" /> Settle with breathing
          </button>
        </>
      )}

      {stage === "breathe" && (
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <div
              className="absolute inset-0 rounded-full bg-indigo-500/20 border-2 border-indigo-400/40 transition-transform"
              style={{
                transform: `scale(${phase === "In" ? 1 + (count / 4) * 0.3 : 1.3 - (count / 6) * 0.3})`,
                transitionDuration: "1s",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-indigo-200">{phase === "In" ? "In" : "Out"}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3">Cycle {Math.min(cyclesDone + 1, 4)} of 4</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setBreathing((b) => !b)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors cursor-pointer"
            >
              {breathing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {breathing ? "Pause" : "Start"}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center justify-center px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
