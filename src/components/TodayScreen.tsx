import { useMemo } from "react";
import { Moon, Wind, ChevronRight, Sparkles, NotebookPen, Pill, Smile, Activity, Compass, Lightbulb, Volume2, Clock3, Settings } from "lucide-react";
import { useLanguage, t } from "../services/i18n";
import Card from "./Card";
import Button from "./Button";
import ToolRow from "./ToolRow";
import Section from "./Section";
import CrisisHeaderButton from "./CrisisHeaderButton";
import AmbientSlot from "./AmbientSlot";
import { useTimeOfDay, type TimeOfDay } from "../hooks/useTimeOfDay";
import { getRecentTools, recordToolUse } from "../services/recentTools";
import { setEmaPrefill } from "../services/emaPrefill";

const MOOD_OPTIONS = [
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "good", emoji: "😊", label: "Good" },
  { id: "okay", emoji: "😐", label: "Okay" },
  { id: "anxious", emoji: "😰", label: "Anxious" },
  { id: "overwhelmed", emoji: "🤯", label: "Overwhelmed" },
] as const;

// Inverse of EmaCheckIn's emaValenceToMood: the tapped face carries into the check-in as its
// 5-point EMA valence, so the check-in never re-asks what the person just told us (redesign §5.1).
const MOOD_TO_VALENCE: Record<(typeof MOOD_OPTIONS)[number]["id"], number> = {
  calm: 3,
  good: 1,
  okay: 0,
  anxious: -1,
  overwhelmed: -3,
};

function formatDate(): string {
  const d = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

interface RecommendedAction {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  route: string;
}

export function getRecommendedAction(hour: number): RecommendedAction {
  if (hour >= 22 || hour < 6) {
    return { icon: <Moon className="w-5 h-5 text-accent" aria-hidden="true" />, title: "Rest well", subtitle: "A gentle bedtime wind-down", route: "winddown" };
  }
  if (hour >= 17) {
    return { icon: <Moon className="w-5 h-5 text-accent" aria-hidden="true" />, title: "Wind Down", subtitle: "Your evening routine", route: "winddown" };
  }
  if (hour >= 12) {
    return { icon: <Wind className="w-5 h-5 text-accent" aria-hidden="true" />, title: "Take a grounding break", subtitle: "A calm minute for your body", route: "plan" };
  }
  return { icon: <Sparkles className="w-5 h-5 text-accent" aria-hidden="true" />, title: "Set your intention for today", subtitle: "A 30-second if-then plan", route: "plan" };
}

export default function TodayScreen({
  go,
  phoneEnabled: _phoneEnabled,
  onEpisode: _onEpisode,
  onOpenCrisis,
}: {
  go: (target: string) => void;
  phoneEnabled: boolean;
  onEpisode: () => void;
  onOpenCrisis: () => void;
}) {
  useLanguage();
  const { timeOfDay } = useTimeOfDay();
  const greetingMap: Record<TimeOfDay, string> = {
    morning: t("greeting_morning"),
    afternoon: t("greeting_day"),
    evening: t("greeting_evening"),
    night: t("greeting_night"),
  };
  const greeting = greetingMap[timeOfDay];
  const recommendedAction = useMemo(() => getRecommendedAction(new Date().getHours()), [timeOfDay]);
  const recentTools = useMemo(() => getRecentTools(), []);

  const TOOL_META: Record<string, { icon: React.ReactNode; label: string }> = {
    plan: { icon: <Wind className="w-4 h-4 text-accent" />, label: "Breathing & Grounding" },
    winddown: { icon: <Moon className="w-4 h-4 text-accent" />, label: "Wind Down" },
    diary: { icon: <NotebookPen className="w-4 h-4 text-accent" />, label: "Diary" },
    medication: { icon: <Pill className="w-4 h-4 text-accent" />, label: "Medication" },
    ema_checkin: { icon: <Smile className="w-4 h-4 text-accent" />, label: "Check-in" },
    assessment: { icon: <Activity className="w-4 h-4 text-accent" />, label: "Assessment" },
    values_to_action: { icon: <Compass className="w-4 h-4 text-accent" />, label: "Values to Action" },
    problem_solving: { icon: <Lightbulb className="w-4 h-4 text-warn" />, label: "Problem Solving" },
    sounds: { icon: <Volume2 className="w-4 h-4 text-success" />, label: "Ambient Sounds" },
    social_rhythm: { icon: <Clock3 className="w-4 h-4 text-accent" />, label: "Social Rhythm" },
  };

  function ago(ts: number): string {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div className="space-y-4 max-w-md mx-auto animate-fade-in px-4" id="today-hub">
      {/* Greeting */}
      <header className="pt-2 pb-1 flex items-center justify-between">
        <div>
          <h1 className="editorial text-2xl text-ink leading-tight">{greeting}</h1>
          <p className="text-sm text-ink-2 mt-0.5">{formatDate()}</p>
        </div>
        <button
          onClick={() => go("settings")}
          className="text-ink-muted hover:text-ink cursor-pointer w-5 h-5"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Mood check-in */}
      <Card variant="raised" padding="md" gap="sm" aria-label="Mood check-in">
        <p className="text-sm font-semibold text-ink">How are you feeling?</p>
        <div className="flex gap-3 justify-between">
          {MOOD_OPTIONS.map((mood) => (
            <Button
              key={mood.id}
              variant="secondary"
              size="lg"
              onClick={() => { setEmaPrefill(MOOD_TO_VALENCE[mood.id]); go("ema_checkin"); }}
              aria-label={`I'm feeling ${mood.label}`}
              className="flex-1 flex-col gap-1 min-h-[64px]"
            >
              <span className="text-2xl" aria-hidden="true">{mood.emoji}</span>
              <span className="text-[10px] text-ink-muted font-normal leading-tight">{mood.label}</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Recommended action */}
      <button
        onClick={() => { recordToolUse(recommendedAction.route); go(recommendedAction.route); }}
        className="w-full bg-accent/8 border border-accent/20 shadow-sm hover:bg-accent/12 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className="shrink-0 w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">{recommendedAction.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-ink">{recommendedAction.title}</span>
          <span className="block text-xs text-ink-muted mt-0.5">{recommendedAction.subtitle}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-ink-faint shrink-0 ml-auto" aria-hidden="true" />
      </button>

      {/* Recently used tools */}
      {recentTools.length > 0 && (
        <Section title="Recently">
          {recentTools.map((entry) => {
            const meta = TOOL_META[entry.target];
            if (!meta) return null;
            return (
              <ToolRow
                key={entry.target}
                icon={meta.icon}
                label={meta.label}
                subtitle={ago(entry.timestamp)}
                onPress={() => { recordToolUse(entry.target); go(entry.target); }}
              />
            );
          })}
        </Section>
      )}

      {/* Ambient slot — the ONLY place a prompt card may appear on Home, capped at 1 (§5.1) */}
      <AmbientSlot go={go} />

      {/* Crisis support — always visible, subtle */}
      <div className="flex justify-center pt-2 pb-4">
        <CrisisHeaderButton onClick={onOpenCrisis} />
      </div>
    </div>
  );
}
