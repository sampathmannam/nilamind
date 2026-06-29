import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  Smartphone, Moon, MapPin, ShieldCheck, Trash2, Sparkles,
  TrendingUp, Lock, Activity, Loader2,
} from "lucide-react";
import {
  type BehaviourSnapshot, type AppCategory,
  isPhoneDataAvailable, isUsageAccessGranted, openUsageAccessSettings,
  getTodaySnapshot, hasHomeLocation, markCurrentLocationAsHome,
} from "../services/phoneBehaviour";
import { saveSnapshot, getRecentSnapshots, clearBehaviourData } from "../db/behaviourDb";
import { generateInsights, assessmentInsights, daysOfData, type Insight } from "../services/patternInsights";
import { loadMoodHistory } from "../services/moodHistory";
import { loadAssessments } from "../services/assessments";

type Phase = "loading" | "web" | "locked" | "ready";

// Plan Part 4 category accents (social=violet, entertainment=amber, communication=teal, productivity=blue)
const CAT_COLORS: Record<AppCategory, string> = {
  social: "#A78BF5", entertainment: "#E8A44A", communication: "#5BBFA0", productivity: "#6B8CFF", other: "#4A5168",
};
const CATS: AppCategory[] = ["social", "entertainment", "communication", "productivity", "other"];

function shortDay(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

export default function BehaviourDashboardScreen() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [today, setToday] = useState<BehaviourSnapshot | null>(null);
  const [history, setHistory] = useState<BehaviourSnapshot[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [pairedDays, setPairedDays] = useState(0);
  const [homeSet, setHomeSet] = useState<boolean>(hasHomeLocation());

  const refresh = async () => {
    // Insights run on mood/lifestyle data (localStorage) + any stored snapshots (Dexie) —
    // the sleep/social ones work on web too, so we always compute and show them.
    const mood = loadMoodHistory();
    const assessments = loadAssessments();
    let hist: BehaviourSnapshot[] = [];
    try { hist = await getRecentSnapshots(30); } catch { /* fresh db */ }

    let nextPhase: Phase = "web";
    if (isPhoneDataAvailable()) {
      if (await isUsageAccessGranted()) {
        try {
          const snap = await getTodaySnapshot();
          await saveSnapshot(snap);
          setToday(snap);
          hist = await getRecentSnapshots(30);
        } catch { /* keep going with what we have */ }
        nextPhase = "ready";
      } else {
        nextPhase = "locked";
      }
    }

    setHistory(hist);
    // Validated-instrument trajectory first (higher-level signal), then the daily behaviour patterns.
    setInsights([...assessmentInsights(assessments, mood), ...generateInsights(hist, mood)]);
    setPairedDays(daysOfData(hist, mood));
    setPhase(nextPhase);
  };

  useEffect(() => { refresh(); }, []);

  const chartData = history.slice(-7).map((s) => {
    const row: Record<string, number | string> = { day: shortDay(s.date) };
    for (const c of CATS) row[c] = s.categoryMinutes ? s.categoryMinutes[c] : 0;
    return row;
  });

  const Header = (
    <div className="flex items-center gap-2">
      <Activity className="w-5 h-5 text-blue-400" />
      <div>
        <h1 className="text-lg font-bold text-slate-100">Phone Patterns</h1>
        <p className="text-[11px] text-slate-500">How your phone use & lifestyle move with your mood</p>
      </div>
    </div>
  );

  const PrivacyBanner = (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex gap-3">
      <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <p className="text-[11px] text-slate-300 leading-relaxed">
        <span className="font-bold text-emerald-400">On your device only.</span> NilaMind reads <span className="text-slate-100 font-semibold">how long</span> you use apps and whether you left home — never message content, never which websites or videos, never your location. Nothing is uploaded.
      </p>
    </div>
  );

  const WebNote = (
    <div className="bg-card border border-slate-800 rounded-2xl p-5 space-y-3 text-center">
      <Smartphone className="w-8 h-8 text-slate-500 mx-auto" />
      <h3 className="text-sm font-semibold text-slate-100">Passive phone signals run on the Android app</h3>
      <p className="text-xs text-slate-400 leading-relaxed">
        Screen time, app categories, last-pickup and leaving-home are collected by the installed NilaMind app — open this on your phone and grant <span className="text-slate-200 font-semibold">Usage Access</span>. The sleep & connection patterns below already work from your check-ins.
      </p>
    </div>
  );

  const LockedConsent = (
    <div className="bg-card border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-amber-400">
        <Lock className="w-4 h-4" />
        <h3 className="text-sm font-semibold">Turn on phone signals</h3>
      </div>
      <div className="space-y-2 text-xs text-slate-300">
        <p className="font-semibold text-slate-200">What NilaMind will read:</p>
        <ul className="space-y-1 list-disc list-inside text-slate-400">
          <li>Time spent per app + category (social, entertainment…)</li>
          <li>When you last picked up your phone</li>
          <li>Whether you left home today (yes/no — never your location)</li>
        </ul>
        <p className="font-semibold text-slate-200 pt-1">Never:</p>
        <ul className="space-y-1 list-disc list-inside text-slate-400">
          <li>Messages, search history, websites, or what you watched</li>
          <li>Photos, camera, or microphone</li>
        </ul>
      </div>
      <button
        onClick={async () => { await openUsageAccessSettings(); }}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer"
      >
        Grant Usage Access
      </button>
      <button
        onClick={async () => { const ok = await markCurrentLocationAsHome(); setHomeSet(ok || hasHomeLocation()); }}
        className="w-full bg-raised border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
      >
        <MapPin className="w-3.5 h-3.5" /> {homeSet ? "Home location set ✓" : "Set current spot as “home” (optional)"}
      </button>
      <button onClick={refresh} className="w-full text-[11px] text-blue-400 hover:underline font-semibold">
        I've granted it — refresh
      </button>
    </div>
  );

  const TodayCard = today && (
    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">Today</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-page rounded-xl py-3 border border-slate-800/60">
          <Smartphone className="w-4 h-4 text-blue-400 mx-auto mb-1" />
          <div className="text-lg font-black text-slate-100 font-mono">{today.screenTimeMinutes != null ? `${Math.floor(today.screenTimeMinutes / 60)}h ${today.screenTimeMinutes % 60}m` : "—"}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Screen</div>
        </div>
        <div className="bg-page rounded-xl py-3 border border-slate-800/60">
          <Moon className="w-4 h-4 text-violet-400 mx-auto mb-1" />
          <div className="text-lg font-black text-slate-100 font-mono">{today.lastPickupTime ?? "—"}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Last pickup</div>
        </div>
        <div className="bg-page rounded-xl py-3 border border-slate-800/60">
          <MapPin className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
          <div className="text-lg font-black text-slate-100 font-mono">{today.leftHome == null ? "—" : today.leftHome ? "Yes" : "No"}</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide">Left home</div>
        </div>
      </div>
      {today.topApps.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {today.topApps.slice(0, 4).map((a) => (
            <div key={a.packageName} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ background: CAT_COLORS[a.category] }} />
                {a.appName}
              </span>
              <span className="font-mono text-slate-400">{a.minutes}m</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const Chart = chartData.length > 0 && (
    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-widest text-slate-500">
        <TrendingUp className="w-3.5 h-3.5" /> Last 7 days · minutes by category
      </div>
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#948A7E" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#948A7E" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#171311", border: "1px solid #2E2922", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#e2e8f0" }} />
          {CATS.map((c) => (
            <Bar key={c} dataKey={c} stackId="a" fill={CAT_COLORS[c]} radius={c === "other" ? [3, 3, 0, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {CATS.map((c) => (
          <span key={c} className="flex items-center gap-1 text-[9px] text-slate-500 capitalize">
            <span className="w-2 h-2 rounded-sm" style={{ background: CAT_COLORS[c] }} /> {c}
          </span>
        ))}
      </div>
    </div>
  );

  const InsightsSection = (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-widest text-slate-500">
        <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Patterns from your data
      </div>
      {insights.length === 0 ? (
        <div className="bg-card border border-slate-800 rounded-2xl p-5 text-center space-y-1">
          <p className="text-xs text-slate-300 font-semibold">No patterns yet — keep logging.</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Patterns surface after about two weeks of check-ins (sleep, mood, connection). Phone-based patterns also need the Android app + Usage Access. Paired phone-days so far: <span className="text-slate-200 font-mono">{pairedDays}</span>.
          </p>
        </div>
      ) : (
        insights.map((i) => (
          <div
            key={i.id}
            className={`bg-card border rounded-2xl p-4 space-y-1.5 border-slate-800 border-l-4 ${i.direction === "protective" ? "border-l-emerald-500" : i.direction === "risk" ? "border-l-amber-500" : "border-l-slate-600"}`}
          >
            <div className="text-xs font-bold text-slate-100">{i.title}</div>
            <p className="text-xs text-slate-300 leading-relaxed">{i.finding}</p>
            <p className="text-[10px] text-slate-500 italic leading-relaxed">{i.basis}</p>
          </div>
        ))
      )}
    </div>
  );

  if (phase === "loading") {
    return (
      <div className="space-y-5">
        {Header}
        <div className="flex items-center justify-center py-16 text-slate-500 gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading your signals…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {Header}
      {PrivacyBanner}
      {phase === "web" && WebNote}
      {phase === "locked" && LockedConsent}
      {phase === "ready" && TodayCard}
      {phase === "ready" && Chart}
      {InsightsSection}
      {phase === "ready" && (
        <button
          onClick={async () => { await clearBehaviourData(); await refresh(); }}
          className="w-full bg-card border border-slate-800 hover:border-rose-500/40 hover:text-rose-400 text-slate-500 font-semibold py-2.5 rounded-xl text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete all behaviour data
        </button>
      )}
    </div>
  );
}
