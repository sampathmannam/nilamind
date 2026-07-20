/** Composes the short, narrative-first summaries shown at the top of each expanded dashboard band.
 *  Per the MIND dashboard study (CHI 2026): a 1–2 sentence text summary reduces cognitive load far
 *  more than a wall of data cards for a distressed user. Pure + deterministic so it is unit-testable.
 *  These are narrative previews ONLY — every underlying number is still visible inside the band.
 *  The count-based narratives (tracking/signals/episodes) are localized via i18n keys; `activity`
 *  and `trends` mirror `compassionateStreak.message` / `moodSummary` which are composed upstream. */
import { tn, type SupportedLang } from "./i18n";

export interface BandNarrativeInput {
  activityMessage: string;
  monthlyWord: string | null;
  behaviourCount: number;
  proactiveCount: number;
  moodSummary: string;
  signalCount: number;
  episodeCount: number;
  sessionCount: number;
  lang: SupportedLang;
}

export interface BandNarratives {
  activity: string;
  tracking: string;
  signals: string;
  trends: string;
  episodes: string;
}

export function buildBandNarratives(i: BandNarrativeInput): BandNarratives {
  const notices = i.behaviourCount + i.proactiveCount;
  const lang = i.lang;
  const tracking =
    (i.monthlyWord ? tn("narr_tracking_month", lang, { word: i.monthlyWord }) : "") +
    (notices > 0
      ? tn(notices === 1 ? "narr_tracking_notices_one" : "narr_tracking_notices_many", lang, { notices })
      : tn("narr_tracking_none", lang, {}));
  const signals =
    i.signalCount > 0
      ? tn(i.signalCount === 1 ? "narr_signals_one" : "narr_signals_many", lang, { count: i.signalCount })
      : tn("narr_signals_none", lang, {});
  const episodesEp =
    i.episodeCount > 0
      ? tn(i.episodeCount === 1 ? "narr_episodes_e_one" : "narr_episodes_e_many", lang, { episodes: i.episodeCount })
      : tn("narr_episodes_none_e", lang, {});
  const episodesSess = tn(
    i.sessionCount === 1 ? "narr_episodes_s_one" : "narr_episodes_s_many",
    lang,
    { sessions: i.sessionCount },
  );
  return {
    activity: i.activityMessage,
    tracking,
    signals,
    trends: i.moodSummary,
    episodes: `${episodesEp} ${episodesSess}`,
  };
}
