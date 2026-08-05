import { useMemo } from "react";
import { Moon, Wind, MessageCircle, ChevronRight, Sparkles } from "lucide-react";
import { useLanguage, t } from "../services/i18n";
import Card from "./Card";
import Button from "./Button";
import CrisisHeaderButton from "./CrisisHeaderButton";
import { useTimeOfDay, type TimeOfDay } from "../hooks/useTimeOfDay";

const MOOD_OPTIONS = [
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "good", emoji: "😊", label: "Good" },
  { id: "okay", emoji: "😐", label: "Okay" },
  { id: "anxious", emoji: "😰", label: "Anxious" },
  { id: "overwhelmed", emoji: "🤯", label: "Overwhelmed" },
] as const;

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

  return (
    <div className="space-y-4 max-w-md mx-auto animate-fade-in px-4" id="today-hub">
      {/* Greeting */}
      <header className="pt-2 pb-1">
        <h1 className="editorial text-2xl text-ink leading-tight">{greeting}</h1>
        <p className="text-sm text-ink-2 mt-0.5">{formatDate()}</p>
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
              onClick={() => go("ema_checkin")}
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
        onClick={() => go(recommendedAction.route)}
        className="w-full bg-accent/8 border border-accent/20 shadow-sm hover:bg-accent/12 p-4 rounded-2xl transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3"
      >
        <span className="shrink-0 w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">{recommendedAction.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-ink">{recommendedAction.title}</span>
          <span className="block text-xs text-ink-muted mt-0.5">{recommendedAction.subtitle}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-ink-faint shrink-0 ml-auto" aria-hidden="true" />
      </button>

      {/* Talk to Nila */}
      <Card variant="glass" padding="md" gap="none">
        <button
          onClick={() => go("nila")}
          className="w-full flex items-center gap-3 cursor-pointer min-h-[44px] active:scale-[0.99] transition-all"
        >
          <span className="shrink-0 text-accent"><MessageCircle className="w-5 h-5" aria-hidden="true" /></span>
          <span className="flex-1 text-sm font-semibold text-ink">Talk to Nila</span>
          <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" aria-hidden="true" />
        </button>
      </Card>

      {/* Crisis support — always visible, subtle */}
      <div className="flex justify-center pt-2 pb-4">
        <CrisisHeaderButton onClick={onOpenCrisis} />
      </div>
    </div>
  );
}
