import React from "react";
import WellbeingTrendCard from "./WellbeingTrendCard";
import CalibrationPeriodCard from "./calibrationPeriod";
import EpisodeMarkerCard from "./EpisodeMarkerCard";
import SkillsPracticeCard from "./SkillsPracticeCard";
import MoodHeatmap from "./MoodHeatmap";
import AffectToneStrip from "./AffectToneStrip";
import PhaseTimeline from "./PhaseTimeline";
import TrendChart, { PHQ9_BANDS } from "./TrendChart";
import type { EpisodeMarker } from "../services/episodeMarker";
import type { AssessmentEntry } from "../services/assessments";

interface ClinicalTrackingSectionProps {
  checkins: { date: string }[];
  mood: { date: string; intensity?: number | null; shame?: number | null; sleepHours?: number | null }[];
  assessments: AssessmentEntry[];
  episodeMarkers: EpisodeMarker[];
  onOpenView?: (route: string) => void;
}

function ClinicalTrackingSection({
  checkins,
  mood,
  assessments,
  episodeMarkers,
  onOpenView,
}: ClinicalTrackingSectionProps) {
  return (
    <>
      {/* Longitudinal wellbeing — fortnightly WHO-5 trend + cadence */}
      <WellbeingTrendCard onTakeCheck={() => onOpenView?.("assessment")} />

      {/* Calibration period — "learning your patterns" for first 30 days */}
      {checkins.length > 0 && (
        <CalibrationPeriodCard startDate={checkins[0]?.date ?? new Date().toISOString()} />
      )}

      {/* Episode-phase marker — only once there are markers. SkillsPracticeCard already self-hides
          when empty (totalPractices === 0); this card kept a full-size "No markers yet" card on the
          dashboard indefinitely (15-day run, 2026-08-24). The screen is off if there's nothing to
          show; the destination stays reachable from its own row. */}
      {episodeMarkers.length > 0 && (
        <EpisodeMarkerCard onOpen={() => onOpenView?.("episode_marker")} />
      )}

      {/* Skills practice — DBT skills-use mechanism loop */}
      <SkillsPracticeCard onOpen={() => onOpenView?.("guided_programs")} />

      {/* Mood Heatmap — window follows the data instead of a fixed half-year. At two weeks of use a
          182-day grid was ~95% "no data" squares: a big, mostly-empty block that reads as absence
          rather than as a pattern. Grow it as the history grows (4 weeks → 26 weeks). */}
      {mood.length >= 7 && (
        <MoodHeatmap
          moods={mood}
          days={(() => {
            const dates = mood.map((m) => m.date).filter(Boolean).sort();
            const first = dates[0] ? new Date(dates[0]).getTime() : Date.now();
            const spanDays = Math.ceil((Date.now() - first) / 86_400_000) + 7;
            return Math.min(182, Math.max(28, spanDays));
          })()}
        />
      )}

      {/* Conversation tone — orb affect accent */}
      <AffectToneStrip />

      {/* Phase Timeline — episode phases over time */}
      {episodeMarkers.length > 0 && (
        <PhaseTimeline markers={episodeMarkers} days={365} />
      )}

      {/* Assessment Trend — PHQ-9 score trajectory with severity bands */}
      {assessments.filter((a) => a.instrument === "PHQ-9").length >= 2 && (
        <TrendChart
          data={assessments
            .filter((a) => a.instrument === "PHQ-9")
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((a) => ({ date: a.date, score: a.total, severity: a.severity }))}
          title="Depression (PHQ-9)"
          bands={PHQ9_BANDS}
          maxScore={27}
          threshold={10}
        />
      )}
    </>
  );
}

export default React.memo(ClinicalTrackingSection);
