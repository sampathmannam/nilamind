// MedicationCheckCard — quick daily med check rendered inline in the stream.
// "Did you take your meds today?" → [Yes] [No] → logged.

import React, { useState } from "react";
import { Pill, Check, X } from "lucide-react";
import { secureLocal } from "../../services/secureLocal";

interface MedicationCheckCardProps {
  onComplete?: () => void;
}

export default function MedicationCheckCard({ onComplete }: MedicationCheckCardProps) {
  const [answered, setAnswered] = useState<boolean | null>(null);

  const handleAnswer = (taken: boolean) => {
    setAnswered(taken);
    // Log to encrypted storage
    const today = new Date().toISOString().split("T")[0];
    try {
      const key = "nilamind_med_log_" + today;
      const existing = secureLocal.getItem(key);
      const log = existing ? JSON.parse(existing) : { doses: [] };
      log.doses.push({ taken, timestamp: Date.now() });
      log.updatedAt = Date.now();
      secureLocal.setItem(key, JSON.stringify(log));
    } catch { /* ignore */ }
    onComplete?.();
  };

  if (answered !== null) {
    return (
      <div className={`rounded-2xl p-4 text-center ${answered ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-amber-500/10 border border-amber-500/25"}`} id="medication-check-done">
        {answered ? (
          <>
            <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-200">Logged as taken</p>
          </>
        ) : (
          <>
            <X className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-amber-200">Logged as missed</p>
            <p className="text-xs text-amber-300/70 mt-1">That's okay — you can take it now if you can.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-page border border-purple-500/25 rounded-2xl p-4" id="medication-check-card">
      <div className="flex items-center gap-3 mb-3">
        <Pill className="w-5 h-5 text-purple-400 shrink-0" />
        <p className="text-sm font-semibold text-slate-100">Did you take your medication today?</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => handleAnswer(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors cursor-pointer"
        >
          <Check className="w-4 h-4" /> Yes
        </button>
        <button
          onClick={() => handleAnswer(false)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" /> Not yet
        </button>
      </div>
    </div>
  );
}
