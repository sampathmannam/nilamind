import { recentAffectDays, computeConversationToneSummary } from "./chatAffect";

export interface AffectToneCell {
  date: string;
  valence: number;
  count: number;
}

export interface AffectToneStrip {
  sufficient: boolean;
  cells: AffectToneCell[];
}

const WINDOW_DAYS = 30;

export function buildAffectToneStrip(now: number = Date.now()): AffectToneStrip {
  const sufficient = computeConversationToneSummary(WINDOW_DAYS, now) !== null;
  const cells = [...recentAffectDays(WINDOW_DAYS, now)]
    .reverse()
    .map((d) => ({ date: d.date, valence: d.valence, count: d.count }));
  return { sufficient, cells };
}
