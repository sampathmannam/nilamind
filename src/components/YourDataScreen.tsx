import React, { useState } from "react";
import { Database, Download, Trash2, ShieldCheck, Loader2, AlertTriangle, Check, FileText, Share2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { secureLocal } from "../services/secureLocal";
import { loadIdentity, exportBackup } from "../services/identity";
import { requireAuth } from "../services/biometricGate";
import { generateCsvReport, buildTextReport, generatePdfBlob, saveReport, buildClinicalJson } from "../services/exportReport";
import { feedbackSummary } from "../services/nilaFeedback";
import { computeRetention, loadAppOpens } from "../services/retentionMetrics";
import { isPilotEnrolled, computePilotSummary } from "../services/pilotStudy";
import { loadAssessments, assessmentsFor } from "../services/assessments";
import { buildFhirBundle } from "../services/fhirExport";
import { recordExportAudit, getExportAudit, type ExportAuditEntry, type ExportKind } from "../services/exportAudit";
import type { ClinicianReportInput, ClinicianMedication, AssessmentTrajectory } from "../services/clinicianReport";
import { generateClinicianPdfBlob } from "../services/clinicianPdf";
import { readEpisodeMarkers } from "../services/episodeMarker";
import { gatherClinicianUsage, protocolsCompletedInPeriod, periodCutoffIso, type ReportPeriod } from "../services/clinicianPeriod";
import { loadInsights } from "../services/nilaInsights";
import { loadRhythm, computeRhythmRegularity, parseTime, type RhythmEntry, type AnchorKey, type RhythmAnchors } from "../services/socialRhythm";
import { loadMoodHistory } from "../services/moodHistory";
import { computeCircadianFeedback } from "../services/circadianFeedback";
import type { BehaviourSnapshot, AppCategory } from "../services/phoneBehaviour";
import { loadMedications, loadMedicationLogs, adherenceRate, commonSideEffects } from "../services/medicationAdherence";
import { nilaStats } from "../services/nilaSessions";
import { summarizeDiaryForClinician } from "../services/diaryClinicianSummary";
import type { DiaryCardEntry } from "../types";
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
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>(30);
  const [audit, setAudit] = useState<ExportAuditEntry[]>(() => getExportAudit());
  const [lastExport, setLastExport] = useState<{ kind: ExportKind; scope: string; filename: string } | null>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const rows = CATEGORIES.map((c) => ({ ...c, n: countFor(c.key) }));
  const total = rows.reduce((s, r) => s + r.n, 0);
  const id = loadIdentity();

  const pushAudit = (e: Omit<ExportAuditEntry, "timestamp">) => {
    recordExportAudit(e);
    setAudit(getExportAudit());
  };

  /** Attempt to open/share a previously exported file via the native share sheet. */
  const handleShareExport = async (entry: ExportAuditEntry) => {
    if (!entry.filename) return;
    setShareErr(null);
    try {
      const uriResult = await Filesystem.getUri({ path: entry.filename, directory: Directory.Documents });
      if (Capacitor.isNativePlatform()) {
        await Share.share({ url: uriResult.uri, title: entry.filename });
      } else {
        // On web the file was downloaded at export time; the history entry is a re-open affordance only.
        setShareErr("On this browser the file was saved to your downloads when you exported it — check there.");
      }
    } catch (e) {
      console.error("[YourData] share export failed:", e);
      setShareErr("Couldn't open this report on your device. Try re-exporting from the buttons above, or open the app's Documents folder.");
    }
  };

  /** Build a timestamped filename to avoid overwrites. */
  const makeExportFilename = (base: string): string => {
    const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    return `${ts}-${base}`;
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
    setLastExport(null);
    try {
      const checkins = loadCheckins();
      const csv = generateCsvReport(checkins);
      if (csv) {
        const filename = makeExportFilename("nilamind-report.csv");
        const result = await saveReport(csv, filename, "text/csv");
        if (result) {
          pushAudit({ kind: "csv", scope: "Check-in report", filename, destination: "device_download" });
          setLastExport({ kind: "csv", scope: "Check-in report", filename });
        }
      }
    } finally { setReportBusy(false); }
  };

  const handleExportPdf = async () => {
    setReportBusy(true);
    setLastExport(null);
    try {
      const checkins = loadCheckins();
      const fb = feedbackSummary();
      const text = buildTextReport(checkins, undefined, computeRetention(), isPilotEnrolled() ? computePilotSummary() ?? undefined : undefined, loadAssessments(), fb.total > 0 ? fb : undefined);
      const blob = generatePdfBlob(text);
      if (blob) {
        const filename = makeExportFilename("nilamind-report.pdf");
        const result = await saveReport(blob, filename, "application/pdf");
        if (result) {
          pushAudit({ kind: "pdf", scope: "Check-in report", filename, destination: "device_download" });
          setLastExport({ kind: "pdf", scope: "Check-in report", filename });
        }
      }
    } finally { setReportBusy(false); }
  };

  const handleExportJson = async () => {
    setReportBusy(true);
    setLastExport(null);
    try {
      const fb = feedbackSummary();
      const json = buildClinicalJson({
        generatedAt: new Date().toISOString(),
        checkins: loadCheckins(),
        assessments: loadAssessments(),
        retention: computeRetention(),
        pilot: isPilotEnrolled() ? computePilotSummary() ?? undefined : undefined,
        feedback: fb.total > 0 ? fb : undefined,
      });
      const filename = makeExportFilename("nilamind-data.json");
      const result = await saveReport(json, filename, "application/json");
      if (result) {
        pushAudit({ kind: "json", scope: "Structured data export", filename, destination: "device_download" });
        setLastExport({ kind: "json", scope: "Structured data export", filename });
      }
    } finally { setReportBusy(false); }
  };

const handleExportFhir = async () => {
     setReportBusy(true);
     setLastExport(null);
     try {
       const bundle = buildFhirBundle({
         generatedAt: new Date().toISOString(),
         subjectId: id?.userId ?? null,
         assessments: loadAssessments(),
       });
       const filename = makeExportFilename("nilamind-fhir-bundle.json");
       const result = await saveReport(bundle, filename, "application/fhir+json");
       if (result) {
         pushAudit({ kind: "fhir", scope: "FHIR R4 assessment bundle", filename, destination: "device_download" });
         setLastExport({ kind: "fhir", scope: "FHIR R4 assessment bundle", filename });
       }
     } finally { setReportBusy(false); }
   };

   // Helper functions for enhanced clinician report
   const calculateEmotionalStateSummary = (checkins: any[]): { 
     intensityDistribution: { mild: number, moderate: number, severe: number };
     topGranularEmotions: Array<{ emotion: string, count: number }>;
     emotionalVariability: number;
   } => {
     // Filter check-ins with valid intensity
     const validCheckins = checkins.filter(c => typeof c.intensity === 'number');
     
     if (validCheckins.length === 0) {
       return {
         intensityDistribution: { mild: 0, moderate: 0, severe: 0 },
         topGranularEmotions: [],
         emotionalVariability: 0
       };
     }
     
     // Calculate intensity distribution (1-3 mild, 4-6 moderate, 7-10 severe)
     const intensities = validCheckins.map(c => c.intensity as number);
     const mild = intensities.filter(i => i >= 1 && i <= 3).length;
     const moderate = intensities.filter(i => i >= 4 && i <= 6).length;
     const severe = intensities.filter(i => i >= 7 && i <= 10).length;
     const total = validCheckins.length;
     
     const intensityDistribution = {
       mild: Math.round((mild / total) * 100),
       moderate: Math.round((moderate / total) * 100),
       severe: Math.round((severe / total) * 100)
     };
     
     // Calculate emotional variability (standard deviation)
     const mean = intensities.reduce((sum, val) => sum + val, 0) / intensities.length;
     const variance = intensities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intensities.length;
     const emotionalVariability = Math.round(Math.sqrt(Math.max(0, variance)) * 10) / 10; // Round to 1 decimal
     
     // Get top granular emotions
     const granularEmotions = checkins
       .filter(c => c.granularEmotion && typeof c.granularEmotion === 'string' && c.granularEmotion.trim() !== '')
       .map(c => c.granularEmotion as string);
     
     const emotionCounts: Record<string, number> = {};
     granularEmotions.forEach(emotion => {
       emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
     });
     
     const topGranularEmotions = Object.entries(emotionCounts)
       .sort(([, a], [, b]) => b - a)
       .slice(0, 5)
       .map(([emotion, count]) => ({ emotion, count }));
     
     return {
       intensityDistribution,
       topGranularEmotions,
       emotionalVariability
     };
   };

   const calculateContextualAnalysis = (checkins: any[]): {
     highIntensityContexts: Array<{ context: string, count: number }>;
     lowIntensityContexts: Array<{ context: string, count: number }>;
   } => {
     // Filter check-ins with valid intensity and context
     const validCheckins = checkins.filter(c => 
       typeof c.intensity === 'number' && 
       c.context && 
       typeof c.context === 'string' && 
       c.context.trim() !== ''
     );
     
     if (validCheckins.length === 0) {
       return {
         highIntensityContexts: [],
         lowIntensityContexts: []
       };
     }
     
     // Split into high intensity (7-10) and low intensity (1-3)
     const highIntensityCheckins = validCheckins.filter(c => 
       (c.intensity as number) >= 7 && (c.intensity as number) <= 10
     );
     
     const lowIntensityCheckins = validCheckins.filter(c => 
       (c.intensity as number) >= 1 && (c.intensity as number) <= 3
     );
     
     // Count contexts for high intensity
     const highContextCounts: Record<string, number> = {};
     highIntensityCheckins.forEach(c => {
       const context = c.context as string;
       highContextCounts[context] = (highContextCounts[context] || 0) + 1;
     });
     
     // Count contexts for low intensity
     const lowContextCounts: Record<string, number> = {};
     lowIntensityCheckins.forEach(c => {
       const context = c.context as string;
       lowContextCounts[context] = (lowContextCounts[context] || 0) + 1;
     });
     
     // Get top 3 for each
     const highIntensityContexts = Object.entries(highContextCounts)
       .sort(([, a], [, b]) => b - a)
       .slice(0, 3)
       .map(([context, count]) => ({ context, count }));
     
     const lowIntensityContexts = Object.entries(lowContextCounts)
       .sort(([, a], [, b]) => b - a)
       .slice(0, 3)
       .map(([context, count]) => ({ context, count }));
     
     return {
       highIntensityContexts,
       lowIntensityContexts
     };
   };

   const calculateWhatHelpedSummary = async (): Promise<Array<{ text: string, date: string }>> => {
     try {
       const insights = loadInsights();
       // Filter for what_helps insights and sort by date descending (most recent first)
       const whatHelpedInsights = insights
         .filter(insight => insight.kind === "what_helps")
         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
         .map(insight => ({
           text: insight.text,
           date: insight.date
         }));
       // Return top 5 most recent
       return whatHelpedInsights.slice(0, 5);
      } catch {
        console.error("Failed to load what_helps insights");
        return [];
     }
   };

   const calculateEnhancedSleepDetails = (checkins: any[], moodHistory: any[]): {
     avgBedtime: string | null;
     avgWakeTime: string | null;
     bedtimeConsistency: number;
     wakeTimeConsistency: number;
   } => {
     // We'll derive sleep times from moodHistory if available, otherwise from check-ins
     // For simplicity, we'll use check-in sleepHours to estimate consistency
     // In a more complete implementation, we'd have actual bedtime/wake time data
     
     const sleepEntries = checkins
       .filter(c => typeof c.sleepHours === 'number' && c.sleepHours > 0)
       .map(c => ({ 
         date: new Date(c.date),
         hours: c.sleepHours as number
       }))
       .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first
     
     if (sleepEntries.length === 0) {
       return {
         avgBedtime: null,
         avgWakeTime: null,
         bedtimeConsistency: 0,
         wakeTimeConsistency: 0
       };
     }
     
     // For now, we'll return placeholder values since we don't have actual bedtime/wake time
     // In a real implementation with more detailed sleep tracking, we would calculate:
     // - Average bedtime and wake time from sleep logs
     // - Consistency scores based on variability of these times
     
     return {
       avgBedtime: null, // Would be calculated from actual bedtime data
       avgWakeTime: null, // Would be calculated from actual wake time data
       bedtimeConsistency: 0, // Placeholder
       wakeTimeConsistency: 0 // Placeholder
     };
   };

const calculateEnhancedSocialRhythmDetails = (rhythmData: any[]): {
        anchorRegularity: Record<string, number>;
        averageAnchorTimes: Record<string, string>;
    } => {
        if (rhythmData.length === 0) {
            return {
                anchorRegularity: {},
                averageAnchorTimes: {}
            };
        }
        
        const now = Date.now();
        const cutoff = now - (14 * 24 * 60 * 60 * 1000); // 14 days
        
        const recentEntries = rhythmData
            .filter(entry => new Date(entry.date).getTime() >= cutoff)
            .slice(-10); // Last 10 entries
        
        if (recentEntries.length === 0) {
            return {
                anchorRegularity: {},
                averageAnchorTimes: {}
            };
        }
        
        const anchorKeys: Array<keyof RhythmAnchors> = ['wake', 'firstContact', 'startActivity', 'dinner', 'bed'];
        const anchorRegularity: Record<string, number> = {};
        const averageAnchorTimes: Record<string, string> = {};
        
        for (const anchor of anchorKeys) {
            const times = recentEntries
                .map(entry => {
                    const timeStr = entry.anchors[anchor];
                    return timeStr ? parseTime(timeStr) : null;
                })
                .filter((t): t is number => t !== null);
            
            if (times.length >= 3) {
                // Calculate mean time in minutes
                const meanMinutes = times.reduce((sum, val) => sum + val, 0) / times.length;
                
                // Convert back to HH:MM format
                const hours = Math.floor(meanMinutes / 60) % 24;
                const minutes = Math.round(meanMinutes) % 60;
                const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
                
                // Calculate standard deviation as a measure of irregularity
                const variance = times.reduce((sum, val) => sum + Math.pow(val - meanMinutes, 2), 0) / times.length;
                const stdDev = Math.sqrt(Math.max(0, variance));
                
                // Convert to consistency score (0-1, where 1 is perfectly consistent)
                // Assuming 30 minutes std dev is completely inconsistent (0), 0 min is perfectly consistent (1)
                const consistency = Math.max(0, Math.min(1, 1 - (stdDev / 30)));
                
                anchorRegularity[anchor] = Math.round(consistency * 100) / 100; // Round to 2 decimal places
                averageAnchorTimes[anchor] = timeString;
            } else {
                anchorRegularity[anchor] = 0;
                averageAnchorTimes[anchor] = "Not enough data";
            }
        }
        
        return {
anchorRegularity,
             averageAnchorTimes
};
       };
   
    const calculateBehavioralInsights = (): {
        screenTimeCorrelation: number | null;
        socialMediaCorrelation: number | null;
        physicalActivityCorrelation: number | null;
        mobilityPatterns: {
            homeTimePercentage: number | null;
            locationVariety: number | null;
        };
    } => {
        // Behavioral insights require longitudinal phone behaviour data (screen time, app usage,
        // location variance) correlated with mood over time. The phoneBehaviour service currently
        // only provides today's snapshot; historical correlations are not yet available.
        // Returning nulls means the clinician report gracefully omits this section.
        return {
            screenTimeCorrelation: null,
            socialMediaCorrelation: null,
            physicalActivityCorrelation: null,
            mobilityPatterns: {
                homeTimePercentage: null,
                locationVariety: null
            }
        };
    };
    
    const calculateUserInsightsSummary = (): {
        workingThrough: Array<{ text: string, date: string }>;
        patternsIdentified: Array<{ text: string, date: string }>;
        contextInsights: Array<{ text: string, date: string }>;
        valuesClarified: Array<{ text: string, date: string }>;
    } => {
        try {
            const insights = loadInsights();
            
            // Group insights by kind and sort by date (most recent first)
            const grouped = {
                workingThrough: insights
                    .filter(i => i.kind === "working_through")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(i => ({ text: i.text, date: i.date })),
                    
                patternsIdentified: insights
                    .filter(i => i.kind === "pattern")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(i => ({ text: i.text, date: i.date })),
                    
                contextInsights: insights
                    .filter(i => i.kind === "context")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(i => ({ text: i.text, date: i.date })),
                    
                valuesClarified: insights
                    .filter(i => i.kind === "value")
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(i => ({ text: i.text, date: i.date }))
            };
            
            // Limit each category to top 3 most recent
            return {
                workingThrough: grouped.workingThrough.slice(0, 3),
                patternsIdentified: grouped.patternsIdentified.slice(0, 3),
                contextInsights: grouped.contextInsights.slice(0, 3),
                valuesClarified: grouped.valuesClarified.slice(0, 3)
            };
        } catch {
            console.error("Failed to load user insights");
            return {
                workingThrough: [],
                patternsIdentified: [],
                contextInsights: [],
valuesClarified: []
             };
         }
      };

      const handleExportClinicianPdf = async () => {
        setReportBusy(true);
        try {
          const now = new Date();
          const periodDays = reportPeriod;
          const yyyymmdd = now.toISOString().slice(0, 10);
          const periodLabel = `${periodDays === 7 ? "Week" : periodDays === 90 ? "90 days" : "Month"} ending ${yyyymmdd}`;
          const cutoff = periodCutoffIso(periodDays);

          const allCheckins = loadCheckins();
          const periodCheckins = allCheckins.filter((c: any) => c.date >= cutoff);

          const uniqueDays = new Set(periodCheckins.map((c: any) => c.date));
          const totalCheckins = periodCheckins.length;
          const daysActive = uniqueDays.size;

          const intensities = periodCheckins.map((c: any) => c.intensity).filter((n: any) => typeof n === "number");
          const avgIntensity = intensities.length > 0 ? intensities.reduce((a: number, b: number) => a + b, 0) / intensities.length : null;

          const moodHist = loadMoodHistory();
          const recentMood = moodHist.filter((m) => m.date >= cutoff);
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
          .filter((e) => e.date >= cutoff)
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
      const periodEpisodes = allEpisodes.filter((e: any) => e.date >= cutoff);
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
      const sortedEpisodes = [...periodEpisodes].sort((a: any, b: any) => (a.date + a.time < b.date + b.time ? 1 : -1));
      const episodes = {
        count: periodEpisodes.length,
        avgDurationMin: ep?.avgDuration ?? null,
        byTimeOfDay: byTimeOfDayStr,
        entries: sortedEpisodes.map((e: any) => ({
          date: e.date,
          time: e.time,
          dayOfWeek: e.dayOfWeek,
          timeOfDay: e.timeOfDay,
          trigger: e.trigger,
          startIntensity: e.startIntensity,
          peakIntensity: e.peakIntensity,
          endIntensity: e.endIntensity,
          durationMinutes: e.durationMinutes,
          skillsHelpful: e.skillsHelpful ?? [],
        })),
      };

      // Phase-18 bipolar-phase markers overlapping the window (self-logged, user-owned).
      const allMarkers = readEpisodeMarkers();
      const phaseMarkers = allMarkers.filter((m) => m.endDate >= cutoff);

      const stats = nilaStats();
      const featuresUsed = featureAdoption();

      // DBT diary card entries within the window — urges/target behaviors, emotions, skills
      // effectiveness (research-grounded redesign, 2026-07-16). Previously never reached the
      // clinician report at all.
      const diaryEntries = (() => {
        try {
          const raw = secureLocal.getItem("nilamind_diary");
          if (!raw) return [];
          const parsed = JSON.parse(raw) as Record<string, DiaryCardEntry>;
          return Object.values(parsed);
        } catch { return []; }
      })();
      const diaryCardSummary = summarizeDiaryForClinician(diaryEntries, cutoff, periodDays);

      // Protocol completions within the window (was hardcoded to 0).
      const completionsRaw = secureLocal.getItem("nilamind_protocol_completions");
      const allCompletions = completionsRaw ? JSON.parse(completionsRaw) : [];
      const protocolsCompleted = protocolsCompletedInPeriod(allCompletions, cutoff);

      // On-device usage + sleep for the window (no OS-level call logs — privacy promise).
      const usage = gatherClinicianUsage(periodDays, now);

       // Calculate enhanced summaries for clinician report
       const checkins = loadCheckins();
       const moodHistory = loadMoodHistory();
        const rhythmData = loadRhythm();
        const emotionalStateSummary = calculateEmotionalStateSummary(checkins);
        const contextualAnalysis = calculateContextualAnalysis(checkins);
        const whatHelpedSummary = await calculateWhatHelpedSummary();
        const enhancedSleepDetails = calculateEnhancedSleepDetails(checkins, moodHistory);
        const enhancedSocialRhythmDetails = calculateEnhancedSocialRhythmDetails(rhythmData);
        const behavioralInsights = calculateBehavioralInsights();
        const userInsightsSummary = calculateUserInsightsSummary();

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
           phaseMarkers,
           diaryCardSummary,
           protocolsCompleted,
          nilaSessions: usage.nilaTurns,
          featuresUsed,
          usage,
          emotionalStateSummary,
          contextualAnalysis,
          whatHelpedSummary,
          enhancedSleepDetails,
          enhancedSocialRhythmDetails,
          behavioralInsights,
          userInsightsSummary
       };

      const blob = generateClinicianPdfBlob(input, {
        checkins: allCheckins,
        activeDayKeys: loadAppOpens(),
        cutoff,
        now,
      });
      if (blob) {
        const filename = makeExportFilename("nilamind-clinician-report.pdf");
        const result = await saveReport(blob, filename, "application/pdf");
        if (result) {
          pushAudit({ kind: "pdf", scope: `Clinician report (${periodDays}-day)`, filename, destination: "device_download" });
          setLastExport({ kind: "pdf", scope: `Clinician report (${periodDays}-day)`, filename });
        }
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
        {lastExport && (
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Saved as <span className="font-mono">{lastExport.filename}</span> — tap it in Export history below to open or share</span>
          </div>
        )}
      </div>

      {/* Clinician summary (structured PDF for psychiatrist) */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Share with your psychiatrist</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">A structured summary your psychiatrist can read — check-ins, sleep, PHQ‑9/GAD‑7 trajectories, medication adherence, episode logs, and on-device app/conversation usage. Choose a time window below. Generated on-device. Not a clinical or diagnostic tool.</p>
        <div className="flex items-center gap-1" id="clinician-period">
          {([7, 30, 90] as ReportPeriod[]).map((d) => (
            <button
              key={d}
              onClick={() => setReportPeriod(d)}
              aria-pressed={reportPeriod === d}
              className={`flex-1 text-xs font-semibold py-1.5 rounded-lg cursor-pointer transition-colors ${
                reportPeriod === d
                  ? "bg-blue-600/30 text-blue-200 border border-blue-500/40"
                  : "bg-page border border-slate-800 text-slate-400 hover:bg-raised"
              }`}
            >
              {d === 7 ? "Week" : d === 30 ? "Month" : "90 days"}
            </button>
          ))}
        </div>
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
        {shareErr && (
          <div className="flex items-start gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{shareErr}</span>
          </div>
        )}
        {audit.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic">No exports yet.</p>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {[...audit].reverse().map((e, i) => (
              <div
                key={i}
                onClick={() => handleShareExport(e)}
                className={`flex items-center justify-between py-2 ${e.filename ? "cursor-pointer hover:bg-slate-800/40 rounded-lg px-1 -mx-1 transition-colors" : ""}`}
                role={e.filename ? "button" : undefined}
                tabIndex={e.filename ? 0 : undefined}
                onKeyDown={e.filename ? (ev) => { if (ev.key === "Enter" || ev.key === " ") handleShareExport(e); } : undefined}
                aria-label={e.filename ? `Open ${e.filename}` : undefined}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-200 capitalize">{e.kind} · {e.scope}</div>
                  <div className="text-xs text-slate-500">{new Date(e.timestamp).toLocaleString()}</div>
                  {e.filename && <div className="text-xs font-mono text-slate-600 truncate max-w-[260px]">{e.filename}</div>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-xs font-mono text-slate-400">{e.destination}</span>
                  {e.filename && <Share2 className="w-3 h-3 text-slate-500" />}
                </div>
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
