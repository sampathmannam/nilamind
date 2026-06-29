import React, { useState } from "react";
import { Database, Download, Trash2, ShieldCheck, Loader2, AlertTriangle, Check } from "lucide-react";
import { secureLocal } from "../services/secureLocal";
import { loadIdentity, exportBackup } from "../services/identity";
import { requireAuth } from "../services/biometricGate";

// "Your data" (AUTOPILOT Phase 2): see exactly what's stored, export it (encrypted, user-controlled),
// or delete everything. All on-device — this screen is the opposite of telemetry.

const CATEGORIES: { key: string; label: string }[] = [
  { key: "nilamind_checkins", label: "Check-ins" },
  { key: "nilamind_diary", label: "Diary entries" },
  { key: "nilamind_episodes", label: "Episode sessions" },
  { key: "nilamind_thought_records", label: "Thought records" },
  { key: "nilamind_assessments", label: "Validated check-ins (PHQ/GAD)" },
  { key: "nilamind_ba_activities", label: "Values to Action — activities" },
  { key: "nilamind_values_actions", label: "Values to Action — steps" },
  { key: "nilamind_critic_logs", label: "Inner-critic entries" },
  { key: "nilamind_compassionate_letters", label: "Compassionate letters" },
  { key: "nilamind_shame_protect_logs", label: "Shame reflections" },
  { key: "nilamind_nila_sessions", label: "Nila session log" },
];

function countFor(key: string): number {
  try {
    const raw = secureLocal.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
    return 1;
  } catch {
    return 0;
  }
}

export default function YourDataScreen() {
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<string | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  const rows = CATEGORIES.map((c) => ({ ...c, n: countFor(c.key) }));
  const total = rows.reduce((s, r) => s + r.n, 0);
  const id = loadIdentity();

  const doExport = async () => {
    if (!id) return;
    if (!(await requireAuth("Confirm it's you to export your data off this device."))) return;
    setBusy(true);
    try { setBackup(await exportBackup(id.mnemonic)); } catch { /* swallow — matches Settings doExport; avoid logging anything export-related */ } finally { setBusy(false); }
  };
  const download = () => {
    if (!backup || !id) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([backup], { type: "text/plain" }));
    a.download = `nilamind-backup-${id.userId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const wipeEverything = async () => {
    if (!(await requireAuth("Confirm it's you to permanently delete everything on this device."))) return;
    setBusy(true);
    try {
      const del = (n: string) => new Promise<void>((res) => { const r = indexedDB.deleteDatabase(n); r.onsuccess = () => res(); r.onerror = () => res(); r.onblocked = () => res(); });
      await del("nilamind_secure");
      await del("nilamind_behaviour");
      for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith("nilamind_")) localStorage.removeItem(k); }
      location.reload(); // back to a fresh first-run
    } catch { setBusy(false); }
  };

  return (
    <div className="space-y-5 max-w-md mx-auto" id="your-data-screen">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2"><Database className="w-5 h-5 text-blue-400" /> Your Data</h1>
        <p className="text-xs text-slate-400 leading-relaxed">Everything NilaMind stores about you, on this device only. You can take it with you or erase it — your call, always.</p>
      </header>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3 flex gap-2.5">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">Encrypted at rest and never uploaded. There is no server copy — if you wipe it here, it's gone.</p>
      </div>

      <div className="bg-card border border-slate-800 rounded-2xl divide-y divide-slate-800/70">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-slate-300">{r.label}</span>
            <span className="text-xs font-mono text-slate-400">{r.n}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-bold text-slate-200">Total records</span>
          <span className="text-xs font-mono font-bold text-slate-100">{total}</span>
        </div>
      </div>

      {/* Export */}
      <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Export (encrypted)</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">A backup file encrypted with your recovery phrase — restore it on a new device by entering the same phrase. No cloud.</p>
        {!backup ? (
          <button onClick={doExport} disabled={busy || !id} id="data-export-btn" className="w-full bg-page border border-slate-800 hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5" /> Create backup file</>}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={download} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Download .txt</button>
            <button onClick={() => navigator.clipboard.writeText(backup)} className="bg-page border border-slate-800 text-slate-300 text-xs px-3 py-2.5 rounded-xl cursor-pointer">Copy</button>
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Delete everything</h3>
        <p className="text-[11px] text-slate-400 leading-relaxed">Erases all your entries AND your recovery phrase from this device, returning the app to a fresh start. This cannot be undone — export a backup first if you might want it back.</p>
        {!confirmWipe ? (
          <button onClick={() => setConfirmWipe(true)} className="w-full bg-card border border-rose-500/30 text-rose-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer">Delete all my data…</button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-rose-200/90">Are you sure? Everything will be gone and the app will restart at onboarding.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmWipe(false)} disabled={busy} className="flex-1 bg-card border border-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer">Keep my data</button>
              <button onClick={wipeEverything} disabled={busy} id="data-wipe-confirm" className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, delete everything"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
