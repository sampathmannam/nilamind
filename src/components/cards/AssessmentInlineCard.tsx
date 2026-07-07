// AssessmentInlineCard — compact PHQ-9/GAD-7 screening rendered inline.
// Numbered buttons (0-3 per question) — no typing, ~8 seconds per question.
// Shows result with severity band at the end.

import React, { useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { PHQ9, GAD7, scoreAssessment, type InstrumentId } from "../../services/assessments";
import { secureLocal } from "../../services/secureLocal";

const INSTRUMENTS: Record<string, typeof PHQ9> = {
  "PHQ-9": PHQ9,
  "GAD-7": GAD7,
};

interface AssessmentInlineCardProps {
  instrument?: InstrumentId;
  onComplete?: () => void;
}

export default function AssessmentInlineCard({ instrument = "PHQ-9", onComplete }: AssessmentInlineCardProps) {
  const inst = INSTRUMENTS[instrument] ?? PHQ9;
  const [currentItem, setCurrentItem] = useState(0);
  const [responses, setResponses] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ score: number; band: typeof inst.bands[0] } | null>(null);

  const handleResponse = (value: number) => {
    const newResponses = [...responses, value];

    // Safety item check (item 9 in PHQ-9)
    if (inst.safetyItemIndex !== undefined && currentItem === inst.safetyItemIndex && value > 0) {
      // Still complete but flag
    }

    if (currentItem + 1 >= inst.items.length) {
      // Complete
      const scored = scoreAssessment(inst.id, newResponses);
      const band = inst.bands.find((b) => scored.total >= b.min && scored.total <= b.max) ?? inst.bands[0];
      setResult({ score: scored.total, band });
      setResponses(newResponses);
      setDone(true);
      // Save to storage
      try {
        const key = `nilamind_assessment_${inst.id}_${new Date().toISOString().split("T")[0]}`;
        secureLocal.setItem(key, JSON.stringify({
          instrumentId: inst.id,
          responses: newResponses,
          score: scored.total,
          date: new Date().toISOString(),
        }));
      } catch { /* ignore */ }
      onComplete?.();
    } else {
      setResponses(newResponses);
      setCurrentItem((c) => c + 1);
    }
  };

  if (done && result) {
    const isSevere = result.score >= 15;
    return (
      <div className={`rounded-2xl p-4 text-center ${isSevere ? "bg-amber-500/10 border border-amber-500/25" : "bg-emerald-500/10 border border-emerald-500/25"}`} id="assessment-inline-done">
        {isSevere ? (
          <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
        ) : (
          <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        )}
        <p className="text-sm font-semibold text-slate-100">{inst.name}: {result.score}/{inst.maxScore}</p>
        <p className="text-xs font-medium mt-1" style={{ color: result.band.tone === "rose" ? "#f87171" : result.band.tone === "amber" ? "#fbbf24" : "#34d399" }}>
          {result.band.label}
        </p>
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{result.band.interpretation}</p>
      </div>
    );
  }

  return (
    <div className="bg-page border border-violet-500/25 rounded-2xl p-4" id="assessment-inline-card">
      {/* Progress */}
      <div className="flex gap-1.5 mb-3">
        <div className="h-1 flex-1 rounded-full bg-violet-400" style={{ width: `${((currentItem) / inst.items.length) * 100}%` }} />
      </div>

      <p className="text-xs text-slate-400 mb-1">{inst.name} — Question {currentItem + 1} of {inst.items.length}</p>
      <p className="text-sm font-semibold text-slate-100 mb-4">{inst.items[currentItem]}</p>

      {/* Response options: Not at all (0), Several days (1), More than half (2), Nearly every day (3) */}
      <div className="grid grid-cols-2 gap-2">
        {inst.responseOptions.map((opt, i) => (
          <button
            key={i}
            onClick={() => handleResponse(i)}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-violet-500/40 text-slate-200 text-xs font-medium transition-colors cursor-pointer text-center"
          >
            <span className="text-lg font-bold text-violet-400">{i}</span>
            <span>{opt}</span>
          </button>
        ))}
      </div>

      {/* Safety item warning */}
      {inst.safetyItemIndex !== undefined && currentItem === inst.safetyItemIndex && (
        <p className="text-[10px] text-amber-400/70 mt-2 text-center">
          If you're having thoughts of self-harm, please reach out. Crisis lines are always available.
        </p>
      )}
    </div>
  );
}
