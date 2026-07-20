import { t as translate, type I18nKey, type SupportedLang } from "../services/i18n";
import CollapsibleSection from "./CollapsibleSection";
import BandNarrative from "./BandNarrative";
import ClinicalTrackingSection from "./ClinicalTrackingSection";
import Section, { SectionDivider } from "./Section";
import InsightCard from "./InsightCard";
import PassiveInsightCard from "./PassiveInsightCard";
import type { CheckInEntry } from "../types";
import type { AssessmentEntry } from "../services/assessments";
import type { Insight, MoodPoint } from "../services/patternInsights";
import { type EpisodeMarker } from "../services/episodeMarker";
import type { ProactiveSurfaceCard } from "../services/proactiveSurfaceRouter";

export interface TrackingBandProps {
  openTracking: boolean;
  summary: string;
  narrative: string;
  checkins: CheckInEntry[];
  mood: MoodPoint[];
  assessments: AssessmentEntry[];
  episodeMarkers: EpisodeMarker[];
  onOpenView?: (target: string) => void;
  behaviourInsights: Insight[];
  proactiveCards: ProactiveSurfaceCard[];
  onProactiveAction: (card: ProactiveSurfaceCard) => void;
  onProactiveDismiss: (cardId: string) => void;
  t?: (key: I18nKey, lang?: SupportedLang) => string;
}

/** The "Tracking" band: clinical sections, behaviours Nila noticed, and proactive insight cards.
 *  Self-contained; card dismissal/action is owned by the parent via callbacks. */
export default function TrackingBand({
  openTracking,
  summary,
  narrative,
  checkins,
  mood,
  assessments,
  episodeMarkers,
  onOpenView,
  behaviourInsights,
  proactiveCards,
  onProactiveAction,
  onProactiveDismiss,
  t = translate,
}: TrackingBandProps) {
  return (
    <CollapsibleSection title={t("tracking")} summary={summary} defaultOpen={openTracking}>
      <BandNarrative text={narrative} />
      <ClinicalTrackingSection
        checkins={checkins}
        mood={mood}
        assessments={assessments}
        episodeMarkers={episodeMarkers}
        onOpenView={onOpenView}
      />

      {(behaviourInsights.length > 0 || proactiveCards.length > 0) && (
        <SectionDivider label={t("what_nila_noticed")} />
      )}

      {/* Behaviour Insights — patterns Nila noticed */}
      {behaviourInsights.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase font-mono tracking-widest text-slate-500">Nila noticed</p>
          {behaviourInsights.slice(0, 3).map((insight, i) => (
            <InsightCard
              key={i}
              insight={{
                title: insight.title,
                body: insight.finding,
                trend: insight.direction === "protective" ? "improving" : insight.direction === "risk" ? "declining" : "stable",
                citation: insight.basis,
              }}
            />
          ))}
        </div>
      )}

      {/* Proactive surface cards — compound signal patterns */}
      {proactiveCards.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase font-mono tracking-widest text-slate-500">Patterns noticed</p>
          {proactiveCards.map((card) => {
            const action = card.action;
            return (
              <PassiveInsightCard
                key={card.id}
                id={card.id}
                type={card.type}
                title={card.title}
                body={card.body}
                icon={card.icon}
                color={card.color}
                actionLabel={action?.label}
                onAction={action ? () => onProactiveAction(card) : undefined}
                onDismiss={() => onProactiveDismiss(card.id)}
              />
            );
          })}
        </div>
      )}
    </CollapsibleSection>
  );
}
