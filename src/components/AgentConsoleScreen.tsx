import { useMemo } from "react";
import {
  Activity, Eye, Brain, Database, HeartHandshake, ShieldCheck, Radar, MessageSquare,
  TrendingDown, TrendingUp, Minus, ChevronRight, FlaskConical, Moon, Heart,
} from "lucide-react";
import { loadMoodHistory } from "../services/moodHistory";
import { nilaStats } from "../services/nilaSessions";
import { computeStreak } from "../services/streaks";
import { loadNilaMemories, recentMemoryLines } from "../services/nilaMemory";
import { detectInflections, type InflectionSignal } from "../services/nilaInflection";
import { getInflectionEnabled } from "../services/inflectionPrefs";
import { loadDonations } from "../services/nilaContributions";
import { feedbackSummary } from "../services/nilaFeedback";
import { loadAssessments } from "../services/assessments";
import { isPhoneDataAvailable } from "../services/phoneBehaviour";
import { selfReportSleepSignal } from "../services/sleepInsight";
import { loadPact } from "../services/pact";
import { secureLocal } from "../services/secureLocal";
import type { CheckInEntry } from "../types";

const DAY = 86400000;
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const r1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function readArr<T>(key: string): T[] {
  try {
    const raw = secureLocal.getItem(key);
    const p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? (p as T[]) : [];
  } catch {
    return [];
  }
}

// AGENT CONSOLE — a single, honest "what does Nila actually hold + do" surface, for the developer-as-user.
// Deliberately NOT a live self-surveillance dashboard (the design review flagged continuous mood-graphs as
// iatrogenic — "rumination with a dashboard"); it summarizes existing on-device state and links out to the
// deep mood analytics rather than fixating on a graph. Everything here is read locally; nothing leaves the phone.
export default function AgentConsoleScreen({ onOpenDashboard, onOpenMemory, onOpenPact }: {
  onOpenDashboard?: () => void;
  onOpenMemory?: () => void;
  onOpenPact?: () => void;
}) {
  const d = useMemo(() => {
    const today = new Date();
    const mood = loadMoodHistory();
    const streak = computeStreak();
    const nila = nilaStats();
    const memories = loadNilaMemories();
    const donations = loadDonations();
    const fb = feedbackSummary();
    const checkins = readArr<CheckInEntry>("nilamind_checkins");

    // engagement: days with any mood/checkin activity in the last 14
    const activeSet = new Set(mood.filter((m) => m.intensity != null || m.shame != null).map((m) => m.date));
    let logged14 = 0;
    for (let i = 0; i < 14; i++) if (activeSet.has(ymd(new Date(today.getTime() - i * DAY)))) logged14++;

    // this-week vs last-week distress
    const wk = (start: number, end: number) => mood.filter((m) => {
      const t = new Date(m.date + "T00:00:00").getTime();
      return t >= today.getTime() - end * DAY && t < today.getTime() - start * DAY && m.intensity != null;
    }).map((m) => m.intensity as number);
    const thisAvg = avg(wk(0, 7)), lastAvg = avg(wk(7, 14));

    // what Nila's noticed (trajectory) — the existing inflection detector
    let inflection: InflectionSignal | null = null;
    try {
      if (getInflectionEnabled()) {
        const sigs = detectInflections(checkins, loadAssessments(), ymd(today));
        inflection = sigs[0] ?? null;
      }
    } catch { /* defensive */ }

    return {
      mood, streak, nila, memories, donations, fb, checkins, logged14, thisAvg, lastAvg,
      sleep: selfReportSleepSignal(),
      pact: loadPact(),
      inflection, inflectionOn: getInflectionEnabled(), phoneSensing: (() => { try { return isPhoneDataAvailable(); } catch { return false; } })(),
    };
  }, []);

  const moodLine = d.thisAvg == null
    ? "No check-ins this week yet."
    : d.lastAvg == null
      ? `Distress ~${r1(d.thisAvg)}/10 this week.`
      : Math.abs(d.thisAvg - d.lastAvg) < 0.5
        ? `Distress ~${r1(d.thisAvg)}/10 — about the same as last week.`
        : d.thisAvg < d.lastAvg
          ? `Distress ~${r1(d.thisAvg)}/10 — down ${r1(d.lastAvg - d.thisAvg)} from last week.`
          : `Distress ~${r1(d.thisAvg)}/10 — up ${r1(d.thisAvg - d.lastAvg)} from last week.`;

  return (
    <div className="space-y-4 max-w-md mx-auto" id="agent-console">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
          <Radar className="w-5 h-5 text-purple-400" /> Agent Console
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed">Everything Nila holds and does, in one place. All read on-device — nothing here leaves your phone.</p>
      </header>

      {/* at a glance */}
      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Activity className="w-4 h-4 text-emerald-400" />} value={`${d.logged14}/14`} label="days logged" />
        <Stat icon={<MessageSquare className="w-4 h-4 text-purple-400" />} value={String(d.nila.last7)} label="Nila chats (7d)" />
        <Stat icon={<Brain className="w-4 h-4 text-blue-400" />} value={String(d.memories.length)} label="memories" />
      </div>

      {/* sleep — the manic-prodrome early-warning, live from self-report (Health Connect when wired) */}
      <Card icon={<Moon className="w-3.5 h-3.5 text-indigo-400" />} title="Sleep">
        {!d.sleep ? (
          <p className="text-xs text-slate-500">Not enough sleep logs yet — note how you slept and Nila can watch for the earliest manic warning (shrinking sleep).</p>
        ) : d.sleep.firing ? (
          <p className="text-sm text-amber-300 leading-relaxed flex items-start gap-1.5"><TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span>{d.sleep.detail}</span></p>
        ) : (
          <p className="text-xs text-slate-400">{d.sleep.detail}</p>
        )}
      </Card>

      {/* what Nila's noticed (trajectory / the agent's eyes) */}
      <Card icon={<Eye className="w-3.5 h-3.5 text-sky-400" />} title="What Nila's noticed">
        {!d.inflectionOn ? (
          <p className="text-xs text-slate-500">Trajectory notices are off. Turn them on in Settings to let Nila gently flag a real shift in your own pattern.</p>
        ) : d.inflection ? (
          <div className="space-y-1.5">
            <p className="text-sm text-slate-200 leading-relaxed flex items-start gap-1.5">
              {d.inflection.direction === "deterioration"
                ? <TrendingUp className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                : <TrendingDown className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />}
              <span>{d.inflection.opener}</span>
            </p>
            <p className="text-[11px] text-slate-500">{d.inflection.basis} · {d.inflection.metric} · {d.inflection.dataPoints} points</p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 flex items-center gap-1.5"><Minus className="w-3.5 h-3.5" /> Nothing notable in your recent trajectory.</p>
        )}
      </Card>

      {/* the pact — your letter to your unwell self (the safe, witness-gated guardian) */}
      <Card icon={<Heart className="w-3.5 h-3.5 text-purple-400" />} title="Your letter to your unwell self">
        {d.pact ? (
          <p className="text-xs text-slate-300 leading-relaxed">Set up. If Nila notices a real shift, she'll show you your own words and offer to reach {d.pact.person.name} — never on her own.</p>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">Not set up yet. A few words to your future unwell self, for the times you can't trust your own head.</p>
        )}
        {onOpenPact && (
          <button onClick={onOpenPact} className="mt-1 py-2 min-h-[44px] text-[11px] font-semibold text-purple-300 hover:text-purple-200 inline-flex items-center gap-0.5 cursor-pointer">
            {d.pact ? "View or edit" : "Write it"} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </Card>

      {/* mood at a glance (summary only — deep graphs live in the dashboard) */}
      <Card icon={<Activity className="w-3.5 h-3.5 text-purple-400" />} title="Mood">
        <p className="text-sm text-slate-200 leading-relaxed">{moodLine}</p>
        {onOpenDashboard && (
          <button onClick={onOpenDashboard} className="mt-1 py-2 min-h-[44px] text-[11px] font-semibold text-purple-300 hover:text-purple-200 inline-flex items-center gap-0.5 cursor-pointer">
            Open full mood dashboard <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </Card>

      {/* engagement / cadence (the self-throttle signal) */}
      <Card icon={<TrendingUp className="w-3.5 h-3.5 text-amber-400" />} title="Engagement">
        <div className="flex items-center gap-4 text-sm text-slate-200">
          <span><span className="font-bold text-amber-400">{d.streak.current}</span> day streak</span>
          <span className="text-slate-600">·</span>
          <span>longest {d.streak.longest}</span>
          <span className="text-slate-600">·</span>
          <span>{d.streak.totalActiveDays} active days</span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">If you go quiet, Nila eases off rather than nagging — fewer prompts, not more.</p>
      </Card>

      {/* what Nila remembers */}
      <Card icon={<Brain className="w-3.5 h-3.5 text-blue-400" />} title="What Nila remembers">
        {d.memories.length ? (
          <>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{recentMemoryLines(3)}</p>
            {onOpenMemory && (
              <button onClick={onOpenMemory} className="mt-1 py-2 min-h-[44px] text-[11px] font-semibold text-blue-300 hover:text-blue-200 inline-flex items-center gap-0.5 cursor-pointer">
                View, edit or delete <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500">Nothing kept yet — Nila only remembers what you okay.</p>
        )}
      </Card>

      {/* contributions (opt-in, consent-first) */}
      <Card icon={<HeartHandshake className="w-3.5 h-3.5 text-rose-400" />} title="Contributions">
        <p className="text-sm text-slate-200">
          <span className="font-bold text-rose-300">{d.donations.length}</span> exchange{d.donations.length === 1 ? "" : "s"} you chose to share
          {d.fb.suggestions ? <span className="text-slate-500"> · {d.fb.suggestions} with notes</span> : null}
        </p>
        <p className="text-[11px] text-slate-500 mt-1.5">Only what you tap "share" on — scrubbed of identifiers, your choice each time.</p>
      </Card>

      {/* safety §9 — status, not a count (crisis is never logged) */}
      <Card icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />} title="Safety (§9)">
        <p className="text-xs text-slate-300 leading-relaxed">
          Always on · model-independent · detects a crisis you're expressing <span className="text-slate-500">now</span> (not a predicted "risk score") and surfaces a human / helpline. Crisis moments are never stored or counted.
        </p>
      </Card>

      {/* sensing + roadmap — honest about what's live vs under review */}
      <Card icon={<Radar className="w-3.5 h-3.5 text-purple-400" />} title="Sensing & roadmap">
        <ul className="space-y-1.5 text-xs">
          <Row on label="Mood + check-ins" note="self-reported, on-device" />
          <Row on={d.inflectionOn} label="Trajectory notices" note={d.inflectionOn ? "active" : "off"} />
          <Row on={d.phoneSensing} label="Phone snapshots (usage/location)" note={d.phoneSensing ? "foreground only" : "unavailable"} />
          <Row label="Sleep via Health Connect (COROS Pace 3)" note="seam built · off — needs plugin+grant" review />
          <Row label="Guardian-with-teeth / autonomous sensing" note="red-panel: conditions first" review />
        </ul>
        <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
          <FlaskConical className="w-3 h-3" /> The agentic sensor-spine + acting guardian are red-panel "conditions" items — Coach + §9 first. See <span className="font-mono text-purple-300">docs/NILA_AGENT_DESIGN.md</span>.
        </p>
      </Card>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-card border border-slate-800 rounded-2xl py-3 px-2 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className="text-lg font-black text-slate-100 font-mono leading-none">{value}</div>
      <div className="text-[9px] text-slate-500 uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">{icon} {title}</h3>
      {children}
    </div>
  );
}

function Row({ on, label, note, review }: { on?: boolean; label: string; note: string; review?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-slate-300">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${review ? "bg-amber-500" : on ? "bg-emerald-500" : "bg-slate-600"}`} />
        {label}
      </span>
      <span className={`text-[10px] shrink-0 ${review ? "text-amber-400" : on ? "text-emerald-400" : "text-slate-600"}`}>{note}</span>
    </li>
  );
}
