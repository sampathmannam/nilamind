// PatternInsightEngine — turns behaviour snapshots + mood/lifestyle history into personal,
// data-backed reflections (plan Part 11.3 / 12.4). Pure functions, zero network, no AI: every
// insight is a transparent local correlation the user's own data supports. Never diagnostic.
//
// CALIBRATION: every threshold below is set from primary research (cited inline). Where the
// evidence says a fixed population cutoff is wrong, we personalize to the user's OWN baseline
// (sleep deviation, late-night use relative to habitual bedtime, mobility vs personal median).
// MIN_GROUP is a noise floor for surfacing a personal correlation, not a research figure.
//
// Sources (verified June 2026):
//  - Sleep↔mood (within-person, U-shaped): Lee et al. 2024, BMC Psychiatry 24:309. Dose-response
//    RRs: Zhai et al. 2015, Depression & Anxiety 32(9):664–670.
//  - Sleep regularity: Li DR et al. 2025, Psychological Medicine (HR 0.62 regular vs irregular).
//  - Night light/pre-sleep use (relative to bedtime, not clock): Chang et al. 2015, PNAS 112(4):1232.
//  - Screen time (~2h inflection, causal): Pieh et al. 2025, BMC Medicine 23:107; cohort OR 1.20.
//  - Social media (~30min ceiling; +13%/hr): Hunt et al. 2018, J Soc Clin Psychol 37(10):751.
//    Shame pathway is upward comparison, not passive minutes: Lei et al. 2026, Front Psychol 17.
//  - Mobility/distance & home-time vs baseline: Currey & Torous 2024, JMIR 26:e51875 (meta);
//    Nguyen et al. 2024, npj Mental Health Research 3:1 (home-time deviation, ~2-wk early warning).
//  - Steps: Bizzozero-Peroni et al. 2024, JAMA Network Open 7(12):e2451208 (≥7,000/day RR 0.69).
//  - Social connection: Erzen & Çıkrıkçı 2018, Int J Soc Psychiatry 64(5):427 (loneliness↔depression
//    r≈0.50); Holt-Lunstad et al. 2010, PLOS Med (weak ties → mortality OR 1.50).

import type { BehaviourSnapshot, AppCategory } from './phoneBehaviour';
import { INSTRUMENTS, type AssessmentEntry, type InstrumentId } from './assessments';

/** Mood/lifestyle signal for a given day, joined to behaviour by date. */
export interface MoodPoint {
  date: string; // YYYY-MM-DD
  intensity?: number | null; // emotion intensity 1–10 (check-in)
  shame?: number | null; // diary-card shame 0–5
  sleepHours?: number | null; // check-in "sleep last night" slider (manual)
  social?: number | null; // check-in social-interaction slider 1–10 (manual)
}

export interface Insight {
  id: string;
  title: string;
  finding: string;
  dataPoints: number;
  direction: 'risk' | 'protective' | 'neutral';
  basis: string; // research grounding, shown small under the finding
}

const MIN_GROUP = 5; // noise floor: ≥5 days in each compared group before surfacing a pattern
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const r1 = (n: number) => Math.round(n * 10) / 10;
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function moodByDate(mood: MoodPoint[]): Record<string, MoodPoint> {
  const m: Record<string, MoodPoint> = {};
  for (const x of mood) m[x.date] = x;
  return m;
}
function nextDay(date: string): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Adjusted minutes-of-day for a last-pickup time, treating post-midnight (h<6) as "late the prior
// night" so 01:30 (1530) sorts after 23:00 (1380) rather than before it.
function pickupAdjMin(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return (h < 6 ? h + 24 : h) * 60 + m;
}
function adjMinToClock(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function socialMin(s: BehaviourSnapshot): number | null {
  return s.categoryMinutes ? s.categoryMinutes.social : null;
}

// 1) Short (or long) sleep → next-day mood. U-shaped, optimum ~7h; short ≤6h, ideal 7–9h, long ≥9h.
//    Within-person evidence: Lee 2024 (BMC Psychiatry); dose-response RRs: Zhai 2015.
function sleepVsMood(_snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight | null {
  const short: number[] = []; // ≤6h
  const ideal: number[] = []; // 7–9h
  const long: number[] = []; // ≥9h
  for (const m of mood) {
    if (m.sleepHours == null || m.intensity == null) continue;
    if (m.sleepHours <= 6) short.push(m.intensity);
    else if (m.sleepHours >= 9) long.push(m.intensity);
    else if (m.sleepHours >= 7) ideal.push(m.intensity);
  }
  if (ideal.length < MIN_GROUP) return null;
  const di = avg(ideal);
  // Short sleep takes priority (more common + more actionable), then long sleep (U-shape).
  if (short.length >= MIN_GROUP && avg(short) - di >= 1.0) {
    return {
      id: 'sleep-short', title: 'Short sleep', direction: 'risk', dataPoints: short.length + ideal.length,
      finding: `After nights under 6h sleep, your distress averaged ${r1(avg(short))}/10 — versus ${r1(di)}/10 after 7–9h.`,
      basis: 'Sleep↔mood is U-shaped (optimum ~7h); within-person, nights far from your usual predict worse next-day affect (Lee et al. 2024, BMC Psychiatry; dose-response RRs in Zhai et al. 2015).',
    };
  }
  if (long.length >= MIN_GROUP && avg(long) - di >= 1.0) {
    return {
      id: 'sleep-long', title: 'Long sleep', direction: 'risk', dataPoints: long.length + ideal.length,
      finding: `After nights of 9h+ sleep, your distress averaged ${r1(avg(long))}/10 — versus ${r1(di)}/10 after 7–9h. The sleep–mood curve runs both ways.`,
      basis: 'The sleep–mood link is U-shaped: both short and long sleep carry higher depression risk (long-sleep RR 1.42; Zhai et al. 2015, Depression & Anxiety).',
    };
  }
  return null;
}

// 2) Late-night phone use → NEXT-day distress. Calibrated to the USER'S habitual last-pickup, not a
//    clock hour (the evidence is about use relative to bedtime, not absolute time — Chang 2015 PNAS).
function nightPhoneVsNextDayDistress(snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight | null {
  const md = moodByDate(mood);
  const adj = snaps.map((s) => pickupAdjMin(s.lastPickupTime)).filter((x): x is number => x != null);
  if (adj.length < MIN_GROUP * 2) return null;
  const usual = median(adj);
  const lateCut = usual + 60; // "later than usual" = >1h past the personal median
  const late: number[] = [];
  const normal: number[] = [];
  for (const s of snaps) {
    const p = pickupAdjMin(s.lastPickupTime);
    if (p == null) continue;
    const nm = md[nextDay(s.date)];
    if (!nm || nm.intensity == null) continue;
    (p > lateCut ? late : normal).push(nm.intensity);
  }
  if (late.length < MIN_GROUP || normal.length < MIN_GROUP) return null;
  if (avg(late) - avg(normal) < 1.0) return null;
  return {
    id: 'night-phone', title: 'Late-night phone use', direction: 'risk', dataPoints: late.length + normal.length,
    finding: `On nights you used your phone later than usual (past ~${adjMinToClock(usual)}), your next-day distress averaged ${r1(avg(late))}/10 — versus ${r1(avg(normal))}/10 on other nights.`,
    basis: 'Screen light near bedtime suppresses melatonin and delays sleep — what matters is use relative to your own sleep time, not the clock (Chang et al. 2015, PNAS).',
  };
}

// 3) Screen time → same-day distress. Inflection is ~2h/day (≥120 min), NOT 4h (Pieh 2025 RCT;
//    cohort OR 1.20, where >2h was more predictive than >3h).
function screenTimeVsDistress(snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight | null {
  const md = moodByDate(mood);
  const heavy: number[] = []; // ≥120 min
  const light: number[] = []; // ≤60 min
  for (const s of snaps) {
    if (s.screenTimeMinutes == null) continue;
    const m = md[s.date];
    if (!m || m.intensity == null) continue;
    if (s.screenTimeMinutes >= 120) heavy.push(m.intensity);
    else if (s.screenTimeMinutes <= 60) light.push(m.intensity);
  }
  if (heavy.length < MIN_GROUP || light.length < MIN_GROUP) return null;
  if (avg(heavy) - avg(light) < 1.0) return null;
  return {
    id: 'screen-time', title: 'Screen-heavy days', direction: 'risk', dataPoints: heavy.length + light.length,
    finding: `On 2h+ screen-time days, your distress averaged ${r1(avg(heavy))}/10 — versus ${r1(avg(light))}/10 on sub-1h days.`,
    basis: 'An RCT cutting screen time to ≤2h/day for 3 weeks improved depression and sleep; cohorts show risk rising past ~2h/day, not 4h (Pieh et al. 2025, BMC Medicine).',
  };
}

// 4) Social-media time → same-day shame. Flag ≥60 min vs ≤30 (Hunt 2018 RCT ceiling ~30 min). The
//    real mechanism is upward social comparison, not passive minutes — minutes are a proxy (Lei 2026).
function socialMediaVsShame(snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight | null {
  const md = moodByDate(mood);
  const high: number[] = []; // ≥60 min
  const low: number[] = []; // ≤30 min
  for (const s of snaps) {
    const mins = socialMin(s);
    if (mins == null) continue;
    const m = md[s.date];
    if (!m || m.shame == null) continue;
    if (mins >= 60) high.push(m.shame);
    else if (mins <= 30) low.push(m.shame);
  }
  if (high.length < MIN_GROUP || low.length < MIN_GROUP) return null;
  if (avg(high) - avg(low) < 0.7) return null;
  return {
    id: 'social-shame', title: 'Social media & shame', direction: 'risk', dataPoints: high.length + low.length,
    finding: `On days with 1h+ in social apps, your shame averaged ${r1(avg(high))}/5 — versus ${r1(avg(low))}/5 on lighter days.`,
    basis: 'A 3-week RCT limiting social apps to ~30 min/day cut depression and loneliness; the harm runs mainly through upward comparison, not scroll time itself (Hunt et al. 2018, J Soc Clin Psychol; Lei et al. 2026, Front Psychol).',
  };
}

// 5) Mobility → same-day mood. Distance traveled is the most robust GPS feature (r≈-0.25); we compare
//    against the user's OWN median (reduced mobility vs personal baseline is the early-warning signal).
//    Falls back to the binary leave-home flag only when distance data is unavailable.
function movementVsMood(snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight | null {
  const md = moodByDate(mood);
  const dist = snaps.map((s) => s.maxDistanceKm).filter((x): x is number => x != null);
  if (dist.length >= MIN_GROUP * 2) {
    const usual = median(dist);
    const out: number[] = []; // moved more than usual
    const stay: number[] = []; // moved less than usual
    for (const s of snaps) {
      if (s.maxDistanceKm == null) continue;
      const m = md[s.date];
      if (!m || m.intensity == null) continue;
      (s.maxDistanceKm >= usual ? out : stay).push(m.intensity);
    }
    if (out.length >= MIN_GROUP && stay.length >= MIN_GROUP && avg(stay) - avg(out) >= 1.0) {
      return {
        id: 'movement', title: 'Getting out & moving', direction: 'protective', dataPoints: out.length + stay.length,
        finding: `On days you travelled more than your usual, your distress averaged ${r1(avg(out))}/10 — versus ${r1(avg(stay))}/10 on low-movement days.`,
        basis: 'Distance travelled is the GPS signal most reliably tied to mood (r≈-0.25); staying home more than your own baseline is an early warning sign (Currey & Torous 2024, JMIR meta; Nguyen et al. 2024, npj Mental Health Research).',
      };
    }
    return null;
  }
  // Fallback: binary left-home (weaker, but usable before enough distance data accrues).
  const outB: number[] = [];
  const inB: number[] = [];
  for (const s of snaps) {
    if (s.leftHome == null) continue;
    const m = md[s.date];
    if (!m || m.intensity == null) continue;
    (s.leftHome ? outB : inB).push(m.intensity);
  }
  if (outB.length < MIN_GROUP || inB.length < MIN_GROUP) return null;
  if (avg(inB) - avg(outB) < 1.0) return null;
  return {
    id: 'left-home', title: 'Getting outside', direction: 'protective', dataPoints: outB.length + inB.length,
    finding: `On days you left home, your distress averaged ${r1(avg(outB))}/10 — versus ${r1(avg(inB))}/10 on days you stayed in.`,
    basis: 'Reduced mobility / more time at home tracks with lower mood and is an early-warning signal (Nguyen et al. 2024, npj Mental Health Research).',
  };
}

// 6) Steps → same-day mood. ≥7,000/day is the evidence-based protective cutoff (benefit plateaus
//    ~7,500). Activates once step data is available (Health Connect). Bizzozero-Peroni 2024, JAMA Netw Open.
function stepsVsMood(snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight | null {
  const md = moodByDate(mood);
  const active: number[] = []; // ≥7,000 steps
  const sedentary: number[] = []; // <5,000 steps
  for (const s of snaps) {
    if (s.steps == null) continue;
    const m = md[s.date];
    if (!m || m.intensity == null) continue;
    if (s.steps >= 7000) active.push(m.intensity);
    else if (s.steps < 5000) sedentary.push(m.intensity);
  }
  if (active.length < MIN_GROUP || sedentary.length < MIN_GROUP) return null;
  if (avg(sedentary) - avg(active) < 1.0) return null;
  return {
    id: 'steps', title: 'Daily movement', direction: 'protective', dataPoints: active.length + sedentary.length,
    finding: `On days you hit 7,000+ steps, your distress averaged ${r1(avg(active))}/10 — versus ${r1(avg(sedentary))}/10 on low-step days.`,
    basis: '≥7,000 steps/day is associated with ~31% lower depression risk (RR 0.69), with benefit levelling off around 7,500 (Bizzozero-Peroni et al. 2024, JAMA Network Open).',
  };
}

// 7) Felt connection → same-day mood. Subjective ≤3 isolated / ≥7 connected — perceived connection is
//    the right construct (loneliness↔depression r≈0.50). Erzen & Çıkrıkçı 2018; Holt-Lunstad 2010.
function socialConnectionVsMood(_snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight | null {
  const connected: number[] = []; // ≥7/10
  const isolated: number[] = []; // ≤3/10
  for (const m of mood) {
    if (m.social == null || m.intensity == null) continue;
    if (m.social >= 7) connected.push(m.intensity);
    else if (m.social <= 3) isolated.push(m.intensity);
  }
  if (connected.length < MIN_GROUP || isolated.length < MIN_GROUP) return null;
  if (avg(isolated) - avg(connected) < 1.0) return null;
  return {
    id: 'social-connection', title: 'Connection vs isolation', direction: 'protective', dataPoints: connected.length + isolated.length,
    finding: `On your more-connected days, distress averaged ${r1(avg(connected))}/10 — versus ${r1(avg(isolated))}/10 on isolated days.`,
    basis: 'Felt connection is among the strongest mood protectors: loneliness correlates with depression at r≈0.50, and weak social ties carry mortality risk on par with major risk factors (Erzen & Çıkrıkçı 2018, Int J Soc Psychiatry; Holt-Lunstad et al. 2010, PLOS Med).',
  };
}

const GENERATORS = [
  sleepVsMood,
  nightPhoneVsNextDayDistress,
  screenTimeVsDistress,
  socialMediaVsShame,
  movementVsMood,
  stepsVsMood,
  socialConnectionVsMood,
];

/** Run every correlation; return only those with enough data to be honest. */
export function generateInsights(snaps: BehaviourSnapshot[], mood: MoodPoint[]): Insight[] {
  // NOTE (future UI refinement, Hunt et al. 2018): the "social media" insight is most actionable on
  // high-distress days — a downstream layer may rank risk-direction insights higher when recent mood
  // is elevated. The engine surfaces all qualifying patterns; prioritization is a presentation concern.
  return GENERATORS.map((fn) => fn(snaps, mood)).filter((x): x is Insight => x !== null);
}

/** How many days of paired behaviour+mood data exist (for the phone-signal empty-state). */
export function daysOfData(snaps: BehaviourSnapshot[], mood: MoodPoint[]): number {
  const moodDates = new Set(mood.filter((m) => m.intensity != null).map((m) => m.date));
  return snaps.filter((s) => s.screenTimeMinutes != null && moodDates.has(s.date)).length;
}

// ── Validated-instrument (PHQ-9 / GAD-7) trajectory ──────────────────────────────────────────────
// These are ~biweekly validated severity scores — far too sparse for the daily within-person
// correlation the generators above do, so we DON'T fake one. Instead we report the change between the
// two most recent scores against the recognised clinically-meaningful-change threshold, and
// (descriptively, never causally) summarise what the lifestyle factors looked like over that window.
//   PHQ-9 ≥5-point change is the standard responder / minimal-clinically-important difference
//   (Löwe et al. 2004, Med Care; NICE). GAD-7 ≥4-point change is the reliable-change benchmark
//   (Löwe et al. 2008, Med Care; Toussaint et al. 2020, J Affect Disord).
export const ASSESSMENT_MCID: Partial<Record<InstrumentId, number>> = { 'PHQ-9': 5, 'GAD-7': 4 };

const prettyDate = (d: string): string =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const daysBetween = (a: string, b: string): number =>
  Math.max(1, Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000));

/** Turn validated assessment history into trajectory insights (one per instrument with ≥2 scores). */
export function assessmentInsights(assessments: AssessmentEntry[], mood: MoodPoint[]): Insight[] {
  const out: Insight[] = [];
  // Only the severity scales get a trajectory; PHQ-2 is a pass/fail screen, not a severity measure.
  for (const id of ["PHQ-9", "GAD-7"] as InstrumentId[]) {
    const series = assessments
      .filter((a) => a.instrument === id)
      .sort((a, b) => a.date.localeCompare(b.date) || a.timestamp.localeCompare(b.timestamp));
    if (series.length < 2) continue;
    const prev = series[series.length - 2];
    const last = series[series.length - 1];
    const delta = last.total - prev.total; // negative = improvement (lower severity)
    const mcid = ASSESSMENT_MCID[id]!;
    const inst = INSTRUMENTS[id];

    let direction: Insight['direction'];
    let trend: string;
    if (delta <= -mcid) { direction = 'protective'; trend = `down ${Math.abs(delta)} points — a clinically meaningful improvement`; }
    else if (delta >= mcid) { direction = 'risk'; trend = `up ${delta} points — a meaningful increase worth watching`; }
    else if (delta === 0) { direction = 'neutral'; trend = 'unchanged'; }
    else { direction = 'neutral'; trend = `a ${Math.abs(delta)}-point ${delta < 0 ? 'dip' : 'rise'} — within normal measurement variation`; }

    // Descriptive lifestyle context across the interval (NOT a causal correlation).
    const inWindow = mood.filter((m) => m.date > prev.date && m.date <= last.date);
    const sleeps = inWindow.map((m) => m.sleepHours).filter((x): x is number => x != null);
    const socials = inWindow.map((m) => m.social).filter((x): x is number => x != null);
    const bits: string[] = [];
    if (sleeps.length >= 3) bits.push(`sleep averaged ${r1(avg(sleeps))}h`);
    if (socials.length >= 3) bits.push(`felt-connection averaged ${r1(avg(socials))}/10`);
    const context = bits.length
      ? ` Over those ${daysBetween(prev.date, last.date)} days your ${bits.join(' and ')} — context, not cause.`
      : '';

    out.push({
      id: `assessment-${id}`,
      title: `${inst.measures} check-in trend (${id})`,
      direction,
      dataPoints: series.length,
      finding: `Your ${id} went from ${prev.total}/${inst.maxScore} (${prev.severity}, ${prettyDate(prev.date)}) to ${last.total}/${inst.maxScore} (${last.severity}, ${prettyDate(last.date)}) — ${trend}.${context}`,
      basis: `${id} is a validated severity scale; a change of ≥${mcid} points is the recognised threshold for a clinically meaningful shift (${id === 'PHQ-9' ? 'Löwe et al. 2004, Med Care; NICE' : 'Löwe et al. 2008, Med Care; Toussaint et al. 2020'}). A trend to discuss with a professional — never a diagnosis.`,
    });
  }
  return out;
}
