// performance.ts — Web Vitals + custom performance marks for LLM latency, cache hits, etc.

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 200;
const listeners = new Set<(metric: PerformanceMetric) => void>();

/** Record a custom performance metric. */
export function recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
  const metric: PerformanceMetric = { name, value, timestamp: Date.now(), metadata };
  metrics.push(metric);
  if (metrics.length > MAX_METRICS) metrics.shift();
  for (const cb of listeners) {
    try { cb(metric); } catch { /* ignore */ }
  }
}

/** Subscribe to new metrics. Returns unsubscribe. */
export function onMetric(cb: (metric: PerformanceMetric) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Get all recorded metrics (for export/debug). */
export function getMetrics(): PerformanceMetric[] {
  return [...metrics];
}

/** Clear all metrics. */
export function clearMetrics(): void {
  metrics.length = 0;
}

/** Measure async function duration and record as metric. */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, metadata);
  }
}

/** Measure sync function duration and record as metric. */
export function measureSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    recordMetric(name, duration, metadata);
  }
}

/** Web Vitals helpers (LCP, FID, CLS, FCP, TTFB) — only on web. */
if (typeof window !== "undefined" && "PerformanceObserver" in window) {
  try {
    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      recordMetric("lcp", last.startTime, { url: window.location.href });
    }).observe({ type: "largest-contentful-paint", buffered: true });

    // FID
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "first-input") {
          const fidEntry = entry as PerformanceEventTiming;
          recordMetric("fid", fidEntry.processingStart - fidEntry.startTime, { target: (fidEntry as any).target });
        }
      }
    }).observe({ type: "first-input", buffered: true });

    // CLS
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      recordMetric("cls", clsValue);
    }).observe({ type: "layout-shift", buffered: true });

    // FCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries.find((e) => e.name === "first-contentful-paint");
      if (fcp) recordMetric("fcp", fcp.startTime);
    }).observe({ type: "paint", buffered: true });
  } catch {
    // ignore — some environments don't support all observers
  }
}