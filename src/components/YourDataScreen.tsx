import React, { useState } from "react";
import { Database, Download, Trash2, ShieldCheck, Loader2, AlertTriangle, Check, FileText } from "lucide-react";
import { secureLocal } from "../services/secureLocal";
import { loadIdentity, exportBackup } from "../services/identity";
import { requireAuth } from "../services/biometricGate";
import { generateCsvReport, buildTextReport, generatePdfBlob, saveReport, buildClinicalJson } from "../services/exportReport";
import { computeRetention } from "../services/retentionMetrics";
import { isPilotEnrolled, computePilotSummary } from "../services/pilotStudy";
import { loadAssessments, assessmentsFor } from "../services/assessments";
import { buildFhirBundle } from "../services/fhirExport";
import { recordExportAudit, getExportAudit, type ExportAuditEntry } from "../services/exportAudit";
import { buildClinicianReport, type ClinicianReportInput, type ClinicianMedication, type AssessmentTrajectory } from "../services/clinicianReport";
import { loadMoodHistory } from "../services/moodHistory";
import { computeCircadianFeedback } from "../services/circadianFeedback";
import { loadRhythm, computeRhythmRegularity } from "../services/socialRhythm";
import { loadMedications, loadMedicationLogs, adherenceRate, commonSideEffects } from "../services/medicationAdherence";
import { nilaStats } from "../services/nilaSessions";
import { featureAdoption } from "../services/usageAnalytics";
import { episodePatterns } from "../services/dashboardInsights";

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
  const [reportBusy, setReportBusy] = useState(false);
  const [audit, setAudit] = useState<ExportAuditEntry[]>(() => getExportAudit());
  const rows = CATEGORIES.map((c) => ({ ...c, n: countFor(c.key) }));
  const total = rows.reduce((s, r) => s + r.n, 0);
  const id = loadIdentity();

  const pushAudit = (e: Omit<ExportAuditEntry, "timestamp">) => {
    recordExportAudit(e);
    setAudit(getExportAudit());
  };

  const doExport = async () => {
    if (!id) return;
    if (!(await requireAuth("Confirm it's you to export your data off this device."))) return;
    setBusy(true);
    try {
      const b = await exportBackup(id.mnemonic);
      setBackup(b);
      pushAudit({ kind: "backup", scope: "Full encrypted backup", destination: "device_download" });
    } catch { /* swallow — matches Settings doExport; avoid logging anything export-related */ }
    finally { setBusy(false); }
  };
  const download = () => {
    if (!backup || !id) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([backup], { type: "text/plain" }));
    a.download = `nilamind-backup-${id.userId}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const loadCheckins = () => {
    try {
      const raw = secureLocal.getItem("nilamind_checkins");
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  };

  const handleExportCsv = async () => {
    setReportBusy(true);
    try {
      const checkins = loadCheckins();
      const csv = generateCsvReport(checkins);
      if (csv) {
        await saveReport(csv, "nilamind-report.csv", "text/csv");
        pushAudit({ kind: "csv", scope: "Check-in report", destination: "device_download" });
      }
    } finally { setReportBusy(false); }
  };

  const handleExportPdf = async () => {
    setReportBusy(true);
    try {
      const checkins = loadCheckins();
      const text = buildTextReport(checkins, undefined, computeRetention(), isPilotEnrolled() ? computePilotSummary() ?? undefined : undefined, loadAssessments());
      const blob = generatePdfBlob(text);
      if (blob) {
        await saveReport(blob, "nilamind-report.pdf", "application/pdf");
        pushAudit({ kind: "pdf", scope: "Check-in report", destination: "device_download" });
      }
    } finally { setReportBusy(false); }
  };

  const handleExportJson = async () => {
    setReportBusy(true);
    try {
      const json = buildClinicalJson({
        generatedAt: new Date().toISOString(),
        checkins: loadCheckins(),
        assessments: loadAssessments(),
        retention: computeRetention(),
        pilot: isPilotEnrolled() ? computePilotSummary() ?? undefined : undefined,
      });
      await saveReport(json, "nilamind-data.json", "application/json");
      pushAudit({ kind: "json", scope: "Structured data export", destination: "device_download" });
    } finally { setReportBusy(false); }
  };

  const handleExportFhir = async () => {
    setReportBusy(true);
    try {
      const bundle = buildFhirBundle({
        generatedAt: new Date().toISOString(),
        subjectId: id?.userId ?? null,
        assessments: loadAssessments(),
      });
      await saveReport(bundle, "nilamind-fhir-bundle.json", "application/fhir+json");
      pushAudit({ kind: "fhir", scope: "FHIR R4 assessment bundle", destination: "device_download" });
    } finally { setReportBusy(false); }
  };

  const handleExportClinicianPdf = async () => {
    setReportBusy(true);
    try {
      const now = new Date();
      const periodDays = 30;
      const yyyymmdd = now.toISOString().slice(0, 10);
      const periodLabel = `Month ending ${yyyymmdd}`;

      const allCheckins = loadCheckins();
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - periodDays);
      const periodCheckins = allCheckins.filter((c: any) => c.date >= cutoff.toISOString().slice(0, 10));

      const uniqueDays = new Set(periodCheckins.map((c: any) => c.date));
      const totalCheckins = periodCheckins.length;
      const daysActive = uniqueDays.size;

      const intensities = periodCheckins.map((c: any) => c.intensity).filter((n: any) => typeof n === "number");
      const avgIntensity = intensities.length > 0 ? intensities.reduce((a: number, b: number) => a + b, 0) / intensities.length : null;

      const moodHist = loadMoodHistory();
      const recentMood = moodHist.slice(-periodDays);
      const sleeps = recentMood.filter((m) => typeof m.sleepHours === "number" && m.sleepHours > 0).map((m) => m.sleepHours as number);
      const avgSleepHours = sleeps.length > 0 ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;

      let circadianScore: number | null = null;
      if (sleeps.length >= 3) {
        const rhythmReg = computeRhythmRegularity(now, periodDays);
        const feedback = computeCircadianFeedback({ sleeps, rhythmVariabilityMin: rhythmReg.overallVariabilityMin ?? undefined });
        circadianScore = feedback?.combinedScore ?? null;
      }

      const rhythmReg = computeRhythmRegularity(now, periodDays);
      const socialRhythmVariability = rhythmReg.overallVariabilityMin;

      const allAssessments = loadAssessments();
      const assessmentTrajectories: AssessmentTrajectory[] = [];
      for (const instrument of ["PHQ-9", "GAD-7"] as const) {
        const entries = assessmentsFor(instrument, allAssessments)
          .filter((e) => e.date >= cutoff.toISOString().slice(0, 10))
          .map((e) => ({ date: e.date, total: e.total, severity: e.severity }));
        if (entries.length > 0) {
          assessmentTrajectories.push({ instrument, entries });
        }
      }

      const allMeds = loadMedications();
      const activeMeds = allMeds.filter((m) => m.active);
      const medications: ClinicianMedication[] = activeMeds.map((m) => ({
        name: m.name,
        dose: m.dose,
        adherenceRate: adherenceRate(m.id, periodDays),
        commonSideEffects: commonSideEffects(m.id, periodDays).map((s) => s.symptom),
      }));

      const allEpisodes = (() => {
        try {
          const raw = secureLocal.getItem("nilamind_episodes");
          if (!raw) return [];
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
      })();
      const periodEpisodes = allEpisodes.filter((e: any) => e.date >= cutoff.toISOString().slice(0, 10));
      const ep = episodePatterns(periodEpisodes);
      const byTimeOfDay = periodEpisodes.reduce((acc: Record<string, number>, e: any) => {
        const tod = e.timeOfDay || "unknown";
        acc[tod] = (acc[tod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const byTimeOfDayStr = Object.entries(byTimeOfDay)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ");
      const episodes = {
        count: periodEpisodes.length,
        avgDurationMin: ep?.avgDuration ?? null,
        byTimeOfDay: byTimeOfDayStr,
      };

      const stats = nilaStats();
      const featuresUsed = featureAdoption();

      const input: ClinicianReportInput = {
        periodLabel,
        periodDays,
        totalCheckins,
        daysActive,
        avgIntensity,
        avgSleepHours,
        circadianScore,
        socialRhythmVariability,
        assessmentTrajectories,
        medications,
        episodes,
        protocolsCompleted: 0,
        nilaSessions: stats.total,
        featuresUsed,
      };

      const text = buildClinicianReport(input);
      const blob = generatePdfBlob(text);
      if (blob) {
        await saveReport(blob, "nilamind-clinician-report.pdf", "application/pdf");
        pushAudit({ kind: "pdf", scope: "Clinician report (30-day)", destination: "device_download" });
      }
    } finally { setReportBusy(false); }
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

      <div className="glass rounded-2xl divide-y divide-slate-800/70">
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
      <div className="glass rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Export (encrypted)</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">A backup file encrypted with your recovery phrase — restore it on a new device by entering the same phrase. No cloud.</p>
        {!backup ? (
          <button onClick={doExport} disabled={busy || !id} id="data-export-btn" className="w-full bg-page border border-slate-800 hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5" /> Create backup file</>}
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={download} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Download .txt</button>
            <button onClick={() => { navigator.clipboard.writeText(backup); pushAudit({ kind: "clipboard", scope: "Full encrypted backup", destination: "clipboard" }); }} className="bg-page border border-slate-800 text-slate-300 text-xs px-3 py-2.5 rounded-xl cursor-pointer">Copy</button>
          </div>
        )}
      </div>

      {/* Clinician-friendly report export */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Export Report</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">A CSV or PDF of your check-in data to share with your doctor, a structured JSON (assessment history, retention &amp; pilot summary) a researcher can read, or an experimental FHIR bundle (LOINC-coded screening scores) for a clinical system. No encryption — saved to this device. Not a clinical or diagnostic tool.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportCsv} disabled={reportBusy} className="flex-1 min-w-[64px] bg-page border border-slate-800 hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
            {reportBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} CSV
          </button>
          <button onClick={handleExportPdf} disabled={reportBusy} className="flex-1 min-w-[64px] bg-page border border-slate-800 hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
            {reportBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
          </button>
          <button onClick={handleExportJson} disabled={reportBusy} id="export-json" className="flex-1 min-w-[64px] bg-page border border-slate-800 hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
            {reportBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} JSON
          </button>
          <button onClick={handleExportFhir} disabled={reportBusy} id="export-fhir" className="flex-1 min-w-[64px] bg-page border border-slate-800 hover:bg-raised text-slate-200 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
            {reportBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} FHIR
          </button>
        </div>
      </div>

      {/* Clinician summary (structured PDF for psychiatrist) */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Share with your psychiatrist</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">A structured 30-day summary your psychiatrist can read in 15 minutes — check-ins, sleep, PHQ‑9/GAD‑7 trajectories, medication adherence, episode logs, and engagement. Generated on-device. Not a clinical or diagnostic tool.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportClinicianPdf} disabled={reportBusy} id="export-clinician-pdf" className="flex-1 min-w-[64px] bg-blue-600/10 border border-blue-500/30 hover:bg-blue-600/20 text-blue-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
            {reportBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Generate report PDF
          </button>
        </div>
      </div>

      {/* Export audit trail */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Export history</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">A private log of every export you've made on this device. Nothing here is ever sent anywhere.</p>
        {audit.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No exports yet.</p>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {[...audit].reverse().map((e, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="text-xs text-slate-200 capitalize">{e.kind} · {e.scope}</div>
                  <div className="text-[10px] text-slate-500">{new Date(e.timestamp).toLocaleString()}</div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">{e.destination}</span>
              </div>
            ))}
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
              <button onClick={() => setConfirmWipe(false)} disabled={busy} className="flex-1 glass text-slate-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer">Keep my data</button>
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
