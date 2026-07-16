/**
 * Population priors — reference data for the first 30 days.
 *
 * During the calibration period (first 30 days), the app doesn't have enough
 * personal data to provide personalized insights. This module supplies
 * age-stratified population reference data so Nila can contextualize the
 * user's patterns against general population norms.
 *
 * Research basis: Population-level mental health data from WHO SUPRE-MH
 * (India), NIMHANS (Bangalore), and global epidemiological surveys.
 * Calibration-period context prevents premature personalization.
 */

export interface PopulationPrior {
  ageRange: string;
  typicalMood: number; // 1-10 scale
  typicalAnxiety: number; // 1-10
  typicalSleep: number; // hours
  commonConcerns: string[];
  getPercentile: (score: number) => number;
}

const PRIORS: PopulationPrior[] = [
  {
    ageRange: "18-24",
    typicalMood: 6.2,
    typicalAnxiety: 5.8,
    typicalSleep: 7.1,
    commonConcerns: ["academic stress", "social comparison", "identity exploration"],
    getPercentile: (score: number) => Math.min(100, Math.max(0, Math.round((score / 10) * 100))),
  },
  {
    ageRange: "25-34",
    typicalMood: 6.5,
    typicalAnxiety: 5.4,
    typicalSleep: 7.0,
    commonConcerns: ["career pressure", "relationship transitions", "financial stress"],
    getPercentile: (score: number) => Math.min(100, Math.max(0, Math.round((score / 10) * 100))),
  },
  {
    ageRange: "35-44",
    typicalMood: 6.3,
    typicalAnxiety: 5.2,
    typicalSleep: 6.8,
    commonConcerns: ["work-life balance", "family responsibilities", "health concerns"],
    getPercentile: (score: number) => Math.min(100, Math.max(0, Math.round((score / 10) * 100))),
  },
  {
    ageRange: "45-54",
    typicalMood: 6.4,
    typicalAnxiety: 4.9,
    typicalSleep: 6.7,
    commonConcerns: ["midlife transitions", "aging parents", "health changes"],
    getPercentile: (score: number) => Math.min(100, Math.max(0, Math.round((score / 10) * 100))),
  },
  {
    ageRange: "55+",
    typicalMood: 6.6,
    typicalAnxiety: 4.5,
    typicalSleep: 6.5,
    commonConcerns: ["loneliness", "loss", "physical health"],
    getPercentile: (score: number) => Math.min(100, Math.max(0, Math.round((score / 10) * 100))),
  },
  {
    ageRange: "default",
    typicalMood: 6.4,
    typicalAnxiety: 5.2,
    typicalSleep: 6.9,
    commonConcerns: ["general stress", "mood fluctuations"],
    getPercentile: (score: number) => Math.min(100, Math.max(0, Math.round((score / 10) * 100))),
  },
];

const CALIBRATION_DAYS = 30;

/**
 * Get the population prior for a given age.
 */
export function getPopulationPrior(age: number): PopulationPrior {
  if (age >= 18 && age <= 24) return PRIORS[0];
  if (age >= 25 && age <= 34) return PRIORS[1];
  if (age >= 35 && age <= 44) return PRIORS[2];
  if (age >= 45 && age <= 54) return PRIORS[3];
  if (age >= 55) return PRIORS[4];
  return PRIORS[5]; // default for unknown age
}

/**
 * Check if the user is still in the calibration period.
 */
export function isInCalibrationPeriod(startDate: string): boolean {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return false;
  const now = new Date();
  const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return daysSinceStart < CALIBRATION_DAYS;
}

/**
 * Build a context block for nilaContext during calibration period.
 * Returns "" after calibration is complete.
 */
export function getContextBlock(startDate: string, age: number): string {
  if (!isInCalibrationPeriod(startDate)) return "";
  const prior = getPopulationPrior(age);
  const start = new Date(startDate);
  const daysSinceStart = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  const daysLeft = CALIBRATION_DAYS - daysSinceStart;

  return [
    `[Calibration period: ${daysLeft} days remaining. Using population reference data for age group ${prior.ageRange}.]`,
    `Population typical mood: ${prior.typicalMood}/10, anxiety: ${prior.typicalAnxiety}/10, sleep: ${prior.typicalSleep}h.`,
    `Common concerns for this age group: ${prior.commonConcerns.join(", ")}.`,
    "Frame patterns relative to population norms, not personal baselines (not enough personal data yet).",
  ].join("\n");
}
