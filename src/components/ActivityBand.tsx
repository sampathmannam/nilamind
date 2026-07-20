import { t as translate, type I18nKey, type SupportedLang } from "../services/i18n";
import CollapsibleSection from "./CollapsibleSection";
import BandNarrative from "./BandNarrative";
import ActivitySection from "./ActivitySection";
import { computeStreak, type CompassionateStreak } from "../services/streaks";
import type { UsageSummary } from "../services/usageAnalytics";
import type { ProtocolAdherenceSummary } from "../services/protocolAdherence";

export interface ActivityBandProps {
  openActivity: boolean;
  summary: string;
  narrative: string;
  streak: ReturnType<typeof computeStreak>;
  compassionateStreak: CompassionateStreak;
  freq14: number;
  nilaChats7d: number;
  usageSummary: UsageSummary;
  protocolAdherence: ProtocolAdherenceSummary;
  streakMessage: string;
  t?: (key: I18nKey, lang?: SupportedLang) => string;
}

/** The "Your activity" band: streak, usage, and program adherence. Self-contained so the main
 *  dashboard screen stays readable. */
export default function ActivityBand({
  openActivity,
  summary,
  narrative,
  streak,
  compassionateStreak,
  freq14,
  nilaChats7d,
  usageSummary,
  protocolAdherence,
  streakMessage,
  t = translate,
}: ActivityBandProps) {
  return (
    <CollapsibleSection title={t("your_activity")} summary={summary} defaultOpen={openActivity}>
      <BandNarrative text={narrative} />
      <ActivitySection
        streak={streak}
        compassionateStreak={compassionateStreak}
        freq14={freq14}
        nilaChats7d={nilaChats7d}
        usageSummary={usageSummary}
        protocolAdherence={protocolAdherence}
        streakMessage={streakMessage}
      />
    </CollapsibleSection>
  );
}
