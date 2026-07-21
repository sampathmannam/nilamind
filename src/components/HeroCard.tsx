import { Wind, Heart, Sparkles, Activity, LifeBuoy } from "lucide-react";
import { t } from "../services/i18n";
import { getUserState } from "../services/modeEngine";
import BreathingCircle from "./BreathingCircle";

/** A single state-aware call-to-action shown at the top of the dashboard. Per the distressed-user
 *  research (Smashing Magazine, Nonori/Teeni): one clear action beats a wall of cards when the user
 *  is anxious, low, or exhausted. The state is derived locally (getUserState) — never network.
 *  A detected crisis state (UX-3) leads with direct support, never a generic "keep going" CTA. */
export default function HeroCard({ onOpenView }: { onOpenView?: (target: string) => void }) {
  const state = getUserState();

  const config = (() => {
    switch (state) {
      case "crisis":
        return { msg: t("hero_crisis"), label: t("hero_crisis_label"), icon: LifeBuoy, route: "episode", tone: "text-rose-400" };
      case "anxious":
        return { msg: t("hero_anxious"), label: t("hero_breathe"), icon: Wind, route: "breathing", tone: "text-blue-400" };
      case "low":
        return { msg: t("hero_low"), label: t("hero_gentle"), icon: Heart, route: "checkin", tone: "text-purple-400" };
      case "elevated":
        return { msg: t("hero_elevated"), label: t("hero_breathe"), icon: Wind, route: "breathing", tone: "text-emerald-400" };
      default:
        return { msg: t("hero_calm"), label: t("hero_checkin"), icon: Sparkles, route: "checkin", tone: "text-amber-400" };
    }
  })();

  const Icon = config.icon;
  const showBreathCue = config.route === "breathing";

  return (
    <div className="bg-card border border-line-strong rounded-2xl p-4 space-y-3">
      <div className="text-xs uppercase font-mono tracking-widest text-ink-faint">{t("hero_title")}</div>
      <div className="flex items-start gap-3">
        <span className={`p-2 rounded-xl bg-fill ${config.tone}`} aria-hidden="true"><Icon className="w-5 h-5" /></span>
        <p className="text-sm text-ink-2 leading-relaxed flex-1">{config.msg}</p>
        {showBreathCue && <BreathingCircle size={44} className="shrink-0" />}
      </div>
      <button
        onClick={() => onOpenView?.(config.route)}
        className="w-full bg-fill hover:bg-line-strong text-ink font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 min-h-[44px] transition-colors"
      >
        <Activity className="w-4 h-4" aria-hidden="true" />
        {config.label}
      </button>
    </div>
  );
}
