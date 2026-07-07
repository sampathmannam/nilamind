import React, { useState } from "react";
import { Pill, Plus, X } from "lucide-react";
import { createMedication, loadMedications, saveMedications, logMedication, adherenceRate, type Medication } from "../services/medicationAdherence";

export default function MedicationAdherenceScreen() {
  const [meds] = useState<Medication[]>(() => loadMedications());
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [, setTick] = useState(0);

  function handleAdd() {
    if (!name.trim()) return;
    const updated = [...meds, createMedication(name.trim(), dose.trim(), "", "daily")];
    saveMedications(updated);
    setName(""); setDose(""); setShowAdd(false);
    setTick((t) => t + 1);
  }

  function handleToggle(med: Medication) {
    logMedication(med.id, true, []);
    setTick((t) => t + 1);
  }

  const currentMeds = loadMedications();

  return (
    <div className="space-y-4 max-w-md mx-auto" id="medication-screen">
      <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Pill className="w-5 h-5 text-blue-400" /> Medication Adherence</h2>
      <p className="text-xs text-slate-400 leading-relaxed">Track your medications. Consistent timing helps them work best.</p>

      {showAdd ? (
        <div className="glass rounded-2xl p-4 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Medication name" className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500" />
          <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose (e.g. 50mg)" className="w-full glass rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-500" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="flex-1 glass rounded-xl py-2 text-xs text-blue-300 cursor-pointer">Save</button>
            <button onClick={() => setShowAdd(false)} className="glass rounded-xl px-3 py-2 text-xs text-slate-400 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAdd(true)} className="w-full glass border-l-4 border-l-blue-500 rounded-r-2xl p-3 flex items-center gap-2 text-xs text-blue-300 cursor-pointer hover:border-blue-400/70 transition-colors">
          <Plus className="w-4 h-4" /> Add medication
        </button>
      )}

      <div className="space-y-2">
        {currentMeds.map((m) => (
          <div key={m.id} className="glass rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-slate-100">{m.name}</span>
                {m.dose && <span className="text-xs text-slate-500 ml-2">{m.dose}</span>}
              </div>
              <span className="text-[10px] font-mono text-slate-500">{Math.round(adherenceRate(m.id))}%</span>
            </div>
            <button onClick={() => handleToggle(m)} className="w-full glass rounded-xl py-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors">
              Log as taken today
            </button>
          </div>
        ))}
        {currentMeds.length === 0 && <p className="text-xs text-slate-500 text-center py-8">No medications added yet.</p>}
      </div>
    </div>
  );
}
