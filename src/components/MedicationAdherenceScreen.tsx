import React, { useEffect, useMemo, useState } from "react";
import { Pill, Plus, Trash2, Check, X, Clock, Calendar } from "lucide-react";
import {
  createMedication,
  loadMedications,
  saveMedications,
  logMedication,
  loadMedicationLogs,
  adherenceRate,
  type Medication,
} from "../services/medicationAdherence";
import { hapticLight } from "../hooks/useHaptics";
import { syncMedicationReminders } from "../services/notifications";
import EmptyState, { EMPTY_STATES } from "./EmptyState";

export default function MedicationAdherenceScreen() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [logsToday, setLogsToday] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("08:00");
  const [schedule, setSchedule] = useState<Medication["schedule"]>("daily");

  useEffect(() => {
    const meds = loadMedications();
    setMedications(meds);
    const today = new Date().toISOString().split("T")[0];
    const logged = new Set(loadMedicationLogs().filter((l) => l.date === today && l.taken).map((l) => l.medId));
    setLogsToday(logged);
  }, []);

  useEffect(() => {
    void syncMedicationReminders(medications);
  }, [medications]);

  const handleAdd = () => {
    if (!name.trim() || !time) return;
    const next = [...medications, createMedication(name.trim(), dose.trim(), time, schedule)];
    saveMedications(next);
    setMedications(next);
    setName("");
    setDose("");
    setTime("08:00");
    setSchedule("daily");
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const next = medications.filter((m) => m.id !== id);
    saveMedications(next);
    setMedications(next);
  };

  const toggleActive = (id: string) => {
    const next = medications.map((m) => (m.id === id ? { ...m, active: !m.active } : m));
    saveMedications(next);
    setMedications(next);
  };

  const markTaken = (id: string) => {
    logMedication(id, true, []);
    setLogsToday((prev) => new Set([...prev, id]));
    hapticLight();
  };

  const markSkipped = (id: string) => {
    logMedication(id, false, []);
    setLogsToday((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const adherence = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of medications) map.set(m.id, adherenceRate(m.id, 7));
    return map;
  }, [medications, logsToday]);

  return (
    <div className="space-y-5 max-w-md mx-auto" id="medication-adherence-screen">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Medications</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition-colors cursor-pointer"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {showForm ? "Cancel" : "Add"}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lamotrigine"
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Dose</label>
              <input
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="e.g. 200mg"
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Schedule</label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as Medication["schedule"])}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="weekly">Weekly</option>
                <option value="as_needed">As needed</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            Save medication
          </button>
        </div>
      )}

      <div className="space-y-3">
        {medications.length === 0 && (
          <EmptyState
            nilaState={EMPTY_STATES.noMedications.nilaState}
            title={EMPTY_STATES.noMedications.title}
            body={EMPTY_STATES.noMedications.body}
            cta={{ label: "Add medication", onClick: () => setShowForm(true) }}
          />
        )}
        {medications.map((med) => {
          const takenToday = logsToday.has(med.id);
          return (
            <div key={med.id} className={`bg-slate-800/60 border rounded-2xl p-4 space-y-3 ${med.active ? "border-slate-700" : "border-slate-700/40 opacity-70"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{med.name} {med.dose}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {med.time}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {med.schedule.replace("_", " ")}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">7-day adherence: {adherence.get(med.id) ?? 0}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={med.active}
                      onChange={() => toggleActive(med.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    aria-label="Delete medication"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => markTaken(med.id)}
                  disabled={takenToday}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer ${takenToday ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 hover:bg-emerald-600 hover:text-white text-slate-300"}`}
                >
                  <Check className="w-3.5 h-3.5" /> {takenToday ? "Taken today" : "Take now"}
                </button>
                <button
                  onClick={() => markSkipped(med.id)}
                  className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
