import React from "react";
import WellbeingTrendCard from "./WellbeingTrendCard";
import CalibrationPeriodCard from "./calibrationPeriod";
import EpisodeMarkerCard from "./EpisodeMarkerCard";
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

      {/* Episode-phase marker — current phase if active */}
      <EpisodeMarkerCard onOpen={() => onOpenView?.("episode_marker")} />

      {/* Mood Heatmap — Year in Pixels */}
      {mood.length >= 7 && <MoodHeatmap moods={mood} days={182} />}

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
          title="PHQ-9 Depression"
          bands={PHQ9_BANDS}
          maxScore={27}
          threshold={10}
        />
      )}
    </>
  );
}

export default React.memo(ClinicalTrackingSection);
