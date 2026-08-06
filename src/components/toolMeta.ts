import {
  Wind, Moon, Volume2, MessageCircle, LifeBuoy, ShieldCheck, Smile, NotebookPen, Pill,
  Activity, Lightbulb, Compass, Clock3, Mountain, AlertTriangle, Link2, BookOpen, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { t } from "../services/i18n";

// Redesign §5.3/§5.6 — the single icon/label registry for every recordable tool target, shared by
// TodayScreen's "Recently", ToolsScreen's "Pinned", and the Calm/Skills hub launchers. Before this,
// TodayScreen kept a private divergent copy (e.g. it still said "Diary" after the tile was renamed
// "Journal" everywhere else) — recency/pin surfaces must never drift from the catalog again.
// Kept as plain data (icon component refs, not JSX) so it stays unit-testable in a node env.
// label/sub are FUNCTIONS so language changes re-resolve through t() on re-render.

export interface ToolMeta {
  Icon: LucideIcon;
  iconClass: string;
  label: () => string;
  sub: () => string;
}

export const TOOL_META: Record<string, ToolMeta> = {
  // ── In the moment ──
  episode: { Icon: LifeBuoy, iconClass: "w-5 h-5 text-danger", label: () => t("tool_episode_label"), sub: () => t("tool_episode_sub") },
  safety_plan: { Icon: ShieldCheck, iconClass: "w-5 h-5 text-success", label: () => "Safety plan", sub: () => "Your steps for the hardest moments — ready before you need them" },
  // ── Calm ──
  calm_hub: { Icon: Wind, iconClass: "w-5 h-5 text-accent", label: () => "Calm space", sub: () => "Breathing, grounding, wind down, and sounds" },
  plan: { Icon: Wind, iconClass: "w-5 h-5 text-accent", label: () => "Breathing & Grounding", sub: () => "Paced breathing, grounding exercises, and TIPP tools" },
  winddown: { Icon: Moon, iconClass: "w-5 h-5 text-accent", label: () => t("tool_winddown_label"), sub: () => t("tool_winddown_sub") },
  sounds: { Icon: Volume2, iconClass: "w-5 h-5 text-success", label: () => "Ambient sounds", sub: () => "White/brown/pink noise for focus, sleep, or calm" },
  reach_out: { Icon: MessageCircle, iconClass: "w-5 h-5 text-success", label: () => t("tool_reach_out_label"), sub: () => t("tool_reach_out_sub") },
  // ── Track ──
  ema_checkin: { Icon: Smile, iconClass: "w-5 h-5 text-accent", label: () => t("tool_ema_label"), sub: () => t("tool_ema_sub") },
  diary: { Icon: NotebookPen, iconClass: "w-5 h-5 text-accent", label: () => t("tool_diary_label"), sub: () => t("tool_diary_sub") },
  medication: { Icon: Pill, iconClass: "w-5 h-5 text-accent", label: () => t("tool_medication_label"), sub: () => t("tool_medication_sub") },
  // ── Skills ──
  skills_hub: { Icon: Lightbulb, iconClass: "w-5 h-5 text-warn", label: () => "Skills & programs", sub: () => "Structured practices, step by step" },
  assessment: { Icon: Activity, iconClass: "w-5 h-5 text-accent", label: () => t("tool_assessment_label"), sub: () => t("tool_assessment_sub") },
  problem_solving: { Icon: Lightbulb, iconClass: "w-5 h-5 text-warn", label: () => t("tool_problem_solving_label"), sub: () => t("tool_problem_solving_sub") },
  values_to_action: { Icon: Compass, iconClass: "w-5 h-5 text-accent", label: () => t("tool_values_work_label"), sub: () => t("tool_values_work_sub") },
  social_rhythm: { Icon: Clock3, iconClass: "w-5 h-5 text-accent", label: () => t("tool_social_rhythm_label"), sub: () => t("tool_social_rhythm_sub") },
  exposure: { Icon: Mountain, iconClass: "w-5 h-5 text-warn-hi", label: () => t("tool_exposure_label"), sub: () => t("tool_exposure_sub") },
  relapse_plan: { Icon: AlertTriangle, iconClass: "w-5 h-5 text-warn", label: () => t("tool_relapse_label"), sub: () => t("tool_relapse_sub") },
  chain_analysis: { Icon: Link2, iconClass: "w-5 h-5 text-accent", label: () => "Chain Analysis", sub: () => "Walk through what happened, moment by moment" },
  guided_programs: { Icon: BookOpen, iconClass: "w-5 h-5 text-accent", label: () => "Guided programs", sub: () => "Research-backed programs Nila walks through with you" },
  // ── Patterns ──
  dashboard: { Icon: TrendingUp, iconClass: "w-5 h-5 text-accent", label: () => t("tool_behaviour_label"), sub: () => t("tool_behaviour_sub") },
};
