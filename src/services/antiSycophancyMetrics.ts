import { secureLocal } from "./secureLocal";

const METRICS_KEY = "nilamind_antisycophancy_metrics";

export interface AntiSycophancyMetrics {
  rule6Fires: number;
  rule6Passes: number;
  rule6Overrides: number;
  totalScans: number;
  lastUpdated: string;
}

export function loadMetrics(): AntiSycophancyMetrics {
  try {
    const raw = secureLocal.getItem(METRICS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    rule6Fires: 0,
    rule6Passes: 0,
    rule6Overrides: 0,
    totalScans: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function saveMetrics(m: AntiSycophancyMetrics): void {
  try {
    secureLocal.setItem(METRICS_KEY, JSON.stringify(m));
  } catch { /* ignore — non-critical */ }
}

let cached: AntiSycophancyMetrics | null = null;

function getCache(): AntiSycophancyMetrics {
  if (!cached) cached = loadMetrics();
  return cached;
}

/**
 * Record a Rule 6 fire (anti-sycophancy block on manic validation).
 * Privacy-preserving: stored locally only, never transmitted.
 */
export function recordRule6Fire(): void {
  const m = getCache();
  m.rule6Fires += 1;
  m.totalScans += 1;
  m.lastUpdated = new Date().toISOString();
  saveMetrics(m);
  cached = m;
}

/**
 * Record a Rule 6 pass (reply was checked and did NOT match any MANIC_VALIDATION).
 * Called when a reply passes the output gate.
 */
export function recordRule6Pass(): void {
  const m = getCache();
  m.rule6Passes += 1;
  m.totalScans += 1;
  m.lastUpdated = new Date().toISOString();
  saveMetrics(m);
  cached = m;
}

/**
 * Record a Rule 6 override (rare — a manual override in future clinician mode).
 * Not used in production currently; reserved for future.
 */
export function recordRule6Override(): void {
  const m = getCache();
  m.rule6Overrides += 1;
  m.totalScans += 1;
  m.lastUpdated = new Date().toISOString();
  saveMetrics(m);
  cached = m;
}

/**
 * Get current metrics snapshot (for display or testing).
 */
export function getAntiSycophancyMetrics(): AntiSycophancyMetrics & {
  fireRate: number;
  toSummaryString: () => string;
} {
  const m = getCache();
  const fireRate = m.totalScans > 0 ? m.rule6Fires / m.totalScans : 0;
  return {
    ...m,
    fireRate,
    toSummaryString: () => {
      if (m.totalScans === 0) return "Anti-sycophancy: no scans recorded yet.";
      return `Anti-sycophancy (Rule 6): fired ${m.rule6Fires} time${m.rule6Fires !== 1 ? "s" : ""}, ` +
        `passed ${m.rule6Passes} time${m.rule6Passes !== 1 ? "s" : ""}, ` +
        `overrides ${m.rule6Overrides}. Fire rate: ${(fireRate * 100).toFixed(1)}%.`;
    },
  };
}

/**
 * Reset all metrics (for testing).
 */
export function resetAntiSycophancyMetrics(): void {
  cached = {
    rule6Fires: 0,
    rule6Passes: 0,
    rule6Overrides: 0,
    totalScans: 0,
    lastUpdated: new Date().toISOString(),
  };
  saveMetrics(cached);
}