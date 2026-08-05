import { localDateKey } from "../services/storageUtils";
import React, { useMemo } from "react";
import { LayoutDashboard, TrendingUp, Sparkles, BookOpen, Users, Settings as SettingsIcon, ShieldCheck } from "lucide-react";

import ToolRow from "./ToolRow";
import Section from "./Section";
import Card from "./Card";
import { useLanguage } from "../services/i18n";
import { computeCompassionateStreak } from "../services/streaks";
import { loadCheckins } from "../services/checkin";
import { secureLocal } from "../services/secureLocal";

function StreakConstellation({ activeDays }: { activeDays: string[] }) {
  const dots: React.ReactNode[] = [];
  const today = new Date();
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + monOffset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = localDateKey(d);
    const active = activeDays.includes(dateStr);
    dots.push(
      <div key={i} className="flex flex-col items-center gap-1" title={dateStr}>
        <div className={`w-4 h-4 rounded-full ${active ? "bg-success/70 shadow-sm shadow-success/30" : "bg-line-strong/50"}`} aria-hidden="true" />
        <span className="text-[10px] font-mono text-ink-faint">{dayLabels[i]}</span>
      </div>
    );
  }
  return <div className="flex items-center justify-center gap-3 mt-2">{dots}</div>;
}

function getLast7Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + monOffset);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(localDateKey(d));
  }
  return dates;
}

function getActiveDaysInRange(): string[] {
  try {
    const list = loadCheckins();
    const weekDays = getLast7Days();
    const active = new Set<string>();
    for (const e of list) {
      if (e?.date && weekDays.includes(e.date)) active.add(e.date);
    }
    return [...active];
  } catch { return []; }
}

export default function YouScreen({ go }: { go: (target: string) => void }) {
  useLanguage();
  const activeDays = getActiveDaysInRange();

  let streak = { current: 0, totalActiveDays: 0, message: "Welcome" };
  try {
    const s = computeCompassionateStreak();
    streak = { current: s.current, totalActiveDays: s.totalActiveDays, message: s.message };
  } catch { /* ignore */ }

  const dataErrors = useMemo(() => {
    const badKeys: string[] = [];
    for (const key of ["nilamind_checkins", "nilamind_episodes", "nilamind_diary", "nilamind_insights"]) {
      try {
        const raw = secureLocal.getItem(key);
        if (raw) { JSON.parse(raw); }
      } catch {
        badKeys.push(key);
      }
    }
    return badKeys;
  }, []);

  return (
    <div className="space-y-4 max-w-md mx-auto animate-fade-in px-4" id="you-hub">
      {dataErrors.length > 0 && (
        <div className="bg-warn/10 border border-warn/30 rounded-2xl p-3 text-xs text-ink-muted flex items-center gap-2" role="alert">
          <span>⚠️</span>
          <span>Some data couldn't load — you may want to back up your data.</span>
        </div>
      )}

      <Card variant="raised" padding="lg" gap="none">
        <div className="text-center">
          <span className="text-2xl font-bold text-ink">{streak.current}-day streak</span>
          <p className="text-xs text-ink-muted mt-1">{streak.message}</p>
        </div>
        <div className="mt-3 pt-3 border-t border-line">
          <StreakConstellation activeDays={activeDays} />
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <span className="text-xs text-ink-faint">{activeDays.length} of 7 days this week</span>
        </div>
      </Card>

      <Section title="Your space">
        <ToolRow
          icon={<LayoutDashboard className="w-5 h-5 text-accent" />}
          label="Dashboard"
          subtitle="Your daily overview"
          onPress={() => go("dashboard")}
        />
        <ToolRow
          icon={<TrendingUp className="w-5 h-5 text-success" />}
          label="Insights"
          subtitle="Patterns and trends"
          onPress={() => go("insights")}
        />
        <ToolRow
          icon={<Sparkles className="w-5 h-5 text-fuchsia-400" />}
          label="Nila Memory"
          subtitle="What Nila remembers"
          onPress={() => go("nila_memory")}
        />
        <ToolRow
          icon={<BookOpen className="w-5 h-5 text-accent" />}
          label="Learn"
          subtitle="Understanding your mind"
          onPress={() => go("learn")}
        />
        <ToolRow
          icon={<Users className="w-5 h-5 text-success" />}
          label="Caregiver"
          subtitle="Share with someone you trust"
          onPress={() => go("caregiver_settings")}
        />
        <ToolRow
          icon={<SettingsIcon className="w-5 h-5 text-ink-2" />}
          label="Settings"
          subtitle="Preferences and options"
          onPress={() => go("settings")}
        />
        <ToolRow
          icon={<ShieldCheck className="w-5 h-5 text-success" />}
          label="Your Data"
          subtitle="Export and manage your information"
          onPress={() => go("your_data")}
        />
      </Section>
    </div>
  );
}
