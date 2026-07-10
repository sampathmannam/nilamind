import React, { useState, useEffect, useCallback } from "react";
import { TrendingDown, Download, AlertCircle, CheckCircle, Gauge, Database } from "lucide-react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { hapticLight } from "../hooks/useHaptics";
import { getMetrics, recordMetric, onMetric, clearMetrics, type PerformanceMetric } from "../services/performance";
import { getCacheStats, type CacheStats } from "../services/llmCache";
import { secureLocal } from "../services/secureLocal";

type Tab = "vitals" | "cache" | "errors";

const VITALS: { name: string; good: number; poor: number; unit: string }[] = [
  { name: "LCP", good: 2500, poor: 4000, unit: "ms" },
  { name: "FID", good: 100, poor: 300, unit: "ms" },
  { name: "CLS", good: 0.1, poor: 0.25, unit: "" },
  { name: "FCP", good: 1800, poor: 3000, unit: "ms" },
  { name: "TTFB", good: 800, poor: 1800, unit: "ms" },
];

const VITAL_NAMES = new Set(VITALS.map((v) => v.name.toLowerCase()));

function ratingFor(name: string, value: number): "good" | "needs-improvement" | "poor" {
  const v = VITALS.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!v) return "good";
  if (value <= v.good) return "good";
  if (value <= v.poor) return "needs-improvement";
  return "poor";
}

function fmt(name: string, value: number): string {
  const v = VITALS.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (v && v.unit === "") return value.toFixed(3);
  if (v && v.unit === "ms") return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${value.toFixed(0)}ms`;
  return String(value);
}

interface ErrorEntry {
  timestamp: number;
  message: string;
  stack?: string;
  componentStack?: string;
  userAgent?: string;
}

export default function PerformanceDashboard() {
  const prefersReduced = useReducedMotion();
  const [tab, setTab] = useState<Tab>("vitals");
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [cache, setCache] = useState<CacheStats>({ hits: 0, misses: 0, evictions: 0, hotSize: 0, diskSize: 0, hitRate: 0 });
  const [errors, setErrors] = useState<ErrorEntry[]>([]);

  const refresh = useCallback(() => {
    setMetrics(getMetrics());
    setCache(getCacheStats());
    try {
      const raw = secureLocal.getItem("nilamind_error_log");
      const parsed = raw ? JSON.parse(raw) : [];
      setErrors(Array.isArray(parsed) ? parsed : []);
    } catch {
      setErrors([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = onMetric(() => refresh());
    const interval = setInterval(refresh, 4000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const handleClear = useCallback(() => {
    clearMetrics();
    refresh();
    hapticLight();
  }, [refresh]);

  const handleExport = useCallback(() => {
    const data = { exportedAt: Date.now(), metrics: getMetrics(), cache: getCacheStats(), errors };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nilamind-perf-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    hapticLight();
  }, [errors]);

  const vitals = metrics.filter((m) => VITAL_NAMES.has(m.name.toLowerCase()));
  const latestVitals: Record<string, number> = {};
  for (const m of vitals) latestVitals[m.name.toLowerCase()] = m.value;

  const ratingColor = (r: string) =>
    r === "good" ? "text-emerald-400" : r === "needs-improvement" ? "text-amber-400" : "text-rose-400";

  return (
    <div className="glass rounded-2xl p-4 space-y-4" id="perf-dashboard">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-blue-400" /> Performance
        </h3>
        <div className="flex gap-2">
          <button onClick={handleClear} className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Clear
          </button>
          <button onClick={handleExport} className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-page rounded-xl p-1">
        {([
          { id: "vitals", label: "Vitals", icon: Gauge },
          { id: "cache", label: "Cache", icon: Database },
          { id: "errors", label: "Errors", icon: AlertCircle },
        ] as { id: Tab; label: string; icon: typeof Gauge }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); hapticLight(); }}
            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-colors ${
              tab === t.id ? "bg-raised text-slate-100" : "text-slate-400"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "vitals" && (
        <div className="space-y-2">
          {VITALS.map((v) => {
            const val = latestVitals[v.name.toLowerCase()];
            if (val === undefined) {
              return (
                <div key={v.name} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-mono">{v.name}</span>
                  <span className="text-slate-500">no data yet</span>
                </div>
              );
            }
            const rating = ratingFor(v.name, val);
            return (
              <div key={v.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-mono">{v.name}</span>
                <span className={ratingColor(rating)}>
                  {fmt(v.name, val)} · {rating.replace("-", " ")}
                </span>
              </div>
            );
          })}
          <p className="text-[10px] text-slate-500 leading-relaxed pt-1">
            Core Web Vitals are collected automatically. Use the app to populate real measurements.
          </p>
        </div>
      )}

      {tab === "cache" && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <Stat label="Cache hits" value={cache.hits} color="text-blue-400" />
          <Stat label="Cache misses" value={cache.misses} color="text-amber-400" />
          <Stat label="Hit rate" value={`${(cache.hitRate * 100).toFixed(0)}%`} color="text-emerald-400" />
          <Stat label="Evictions" value={cache.evictions} color="text-rose-400" />
          <Stat label="Hot size" value={cache.hotSize} color="text-slate-200" />
          <Stat label="Disk size" value={cache.diskSize} color="text-slate-200" />
        </div>
      )}

      {tab === "errors" && (
        <div className="space-y-2">
          {errors.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle className="w-4 h-4" /> No errors logged — nice.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-auto">
              {[...errors].reverse().map((e, i) => (
                <div key={i} className="bg-page rounded-lg p-2 border border-slate-800">
                  <div className="text-[11px] text-rose-300 break-words">{e.message}</div>
                  <div className="text-[10px] text-slate-500">{new Date(e.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-page rounded-xl p-3">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}
