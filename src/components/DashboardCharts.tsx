import React from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
  Scatter, ComposedChart, ScatterChart,
} from "recharts";
import { TrendingUp as TrendUpIcon } from "lucide-react";
import { t } from "../services/i18n";

/** Recharts is a heavy dependency (~100kB+). This component isolates ALL Recharts usage on the
 *  dashboard so it can be code-split into its own chunk and lazy-loaded behind a Suspense fallback
 *  (perf: the rest of the dashboard renders instantly; charts stream in). Kept as a named export so
 *  DashboardScreen can React.lazy() it. */
export interface DashboardChartsProps {
  timeRange: "7d" | "30d";
  setTimeRange: (r: "7d" | "30d") => void;
  chartTab: "emotion" | "context" | "energy" | "sleep-mood";
  setChartTab: (c: "emotion" | "context" | "energy" | "sleep-mood") => void;
  // Recharts accepts loosely-typed row arrays; the producing services define precise shapes.
  emotionTrendWithEma: unknown[];
  energyScatter: unknown[];
  sleepMoodTrendData: unknown[];
  ctxTrend: unknown[];
  emoBars: Array<{ name: string; value: number }>;
  weeklyBars: Array<{ day: string; avg: number; count: number }>;
  trendLength: number;
}

export default function DashboardCharts(props: DashboardChartsProps) {
  const {
    timeRange, setTimeRange, chartTab, setChartTab,
    emotionTrendWithEma, energyScatter, sleepMoodTrendData, ctxTrend,
    emoBars, weeklyBars, trendLength,
  } = props;

  return (
    <>
      {trendLength >= 2 ? (
        <div className="glass rounded-2xl p-4 space-y-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5"><TrendUpIcon className="w-3.5 h-3.5" /> Trend</h2>
              <div className="flex bg-page border border-slate-800 rounded-lg overflow-hidden p-0.5">
                {(["7d", "30d"] as const).map((r) => (
                  <button key={r} onClick={() => setTimeRange(r)} aria-label={`Show ${r === "7d" ? "7 day" : "30 day"} trend`} aria-pressed={timeRange === r}
                    className={`text-xs px-3 min-h-[44px] inline-flex items-center justify-center rounded-md font-medium transition-colors ${timeRange === r ? "bg-fill text-slate-300" : "text-slate-500 hover:text-slate-300"}`}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex bg-page border border-slate-800 rounded-lg overflow-hidden p-0.5 self-start">
              <button onClick={() => setChartTab("emotion")} aria-label="Show emotion trend" aria-pressed={chartTab === "emotion"}
                className={`text-xs px-3 min-h-[44px] inline-flex items-center justify-center rounded-md font-medium transition-colors ${chartTab === "emotion" ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"}`}>Emotion</button>
              <button onClick={() => setChartTab("context")} aria-label="Show sleep and social context" aria-pressed={chartTab === "context"}
                className={`text-xs px-3 min-h-[44px] inline-flex items-center justify-center rounded-md font-medium transition-colors ${chartTab === "context" ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"}`}>Context</button>
              <button onClick={() => setChartTab("energy")} aria-label="Show mood vs energy scatter" aria-pressed={chartTab === "energy"}
                className={`text-xs px-3 min-h-[44px] inline-flex items-center justify-center rounded-md font-medium transition-colors ${chartTab === "energy" ? "bg-warn/20 text-warn" : "text-slate-500 hover:text-slate-300"}`}>Energy</button>
              <button onClick={() => setChartTab("sleep-mood")} aria-label="Show sleep vs mood correlation" aria-pressed={chartTab === "sleep-mood"}
                className={`text-xs px-3 min-h-[44px] inline-flex items-center justify-center rounded-md font-medium transition-colors ${chartTab === "sleep-mood" ? "bg-success/20 text-success" : "text-slate-500 hover:text-slate-300"}`}>Sleep-Mood</button>
            </div>
          </div>
          <div className="w-full h-48" role="img" aria-label={chartTab === "emotion" ? "Line chart showing emotional intensity trend over time. Lower values indicate calmer states." : chartTab === "energy" ? "Scatter plot of mood intensity vs energy level. Each dot is one check-in." : chartTab === "sleep-mood" ? "Dual-axis line chart showing sleep hours and mood intensity over time." : "Line chart showing sleep hours and social connection over time."}>
            <ResponsiveContainer width="100%" height="100%">
              {chartTab === "emotion" ? (
                <ComposedChart data={emotionTrendWithEma}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                  <XAxis dataKey="date" stroke="#948A7E" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#948A7E" fontSize={10} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px" }} labelStyle={{ color: "#ECE5DA" }} itemStyle={{ color: "#9479B0" }} />
                  <Line type="monotone" dataKey="intensity" name="Intensity" stroke="#9479B0" strokeWidth={3} activeDot={{ r: 6, fill: "#D8B4FE", stroke: "#9479B0" }} dot={{ r: 4, fill: "#211C17" }} />
                  {/* EMA micro-check-in dots (re-audit #4): Scatter belongs in a ComposedChart — inside a
                      LineChart recharts silently drops it. Reads emaIntensity off the SAME array as the
                      Line (mergeEmaIntoTrend) rather than a separately-ordered array — otherwise Recharts
                      merges the two arrays' orderings into a jumbled, non-chronological date axis (device
                      screenshot 2026-07-16: loadEmaEntries() is newest-first, emotionTrend is oldest-first). */}
                  <Scatter dataKey="emaIntensity" name="Quick check-in" fill="#D8A657" />
                </ComposedChart>
              ) : chartTab === "energy" ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                  <XAxis dataKey="energy" stroke="#948A7E" fontSize={10} tickLine={false} axisLine={false} domain={[0.5, 4.5]} ticks={[1, 2, 3, 4]} tickFormatter={(v: number) => ["", "Very low", "Low", "Moderate", "High"][v] || ""} />
                  <YAxis stroke="#948A7E" fontSize={10} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} label={{ value: "Distress", angle: -90, position: "insideLeft", style: { fill: "#948A7E", fontSize: 10 } }} />
                  <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px" }} labelFormatter={() => ""} wrapperStyle={{ fontSize: "12px" }} />
                  <Scatter data={energyScatter} dataKey="intensity" name="Distress" fill="#D8A657" stroke="#2E2922" strokeWidth={0.5} />
                </ScatterChart>
              ) : chartTab === "sleep-mood" ? (
                <LineChart data={sleepMoodTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                  <XAxis dataKey="date" stroke="#948A7E" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#948A7E" fontSize={10} domain={[0, 14]} allowDecimals={false} tickLine={false} axisLine={false} orientation="left" />
                  <YAxis yAxisId="right" stroke="#948A7E" fontSize={10} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#ECE5DA" }} />
                  <Legend wrapperStyle={{ fontSize: "10px", color: "#948A7E" }} verticalAlign="top" height={36} />
                  <Line yAxisId="left" type="monotone" dataKey="sleepHours" name="Sleep (hrs)" stroke="#46735C" strokeWidth={3} dot={{ r: 3, fill: "#211C17" }} />
                  <Line yAxisId="right" type="monotone" dataKey="intensity" name="Distress" stroke="#9479B0" strokeWidth={3} dot={{ r: 3, fill: "#211C17" }} />
                </LineChart>
              ) : (
                <LineChart data={ctxTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                  <XAxis dataKey="date" stroke="#948A7E" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#948A7E" fontSize={10} domain={[0, 14]} allowDecimals={false} tickLine={false} axisLine={false} orientation="left" />
                  <YAxis yAxisId="right" stroke="#948A7E" fontSize={10} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px", fontSize: "12px" }} labelStyle={{ color: "#ECE5DA" }} />
                  <Legend wrapperStyle={{ fontSize: "10px", color: "#948A7E" }} verticalAlign="top" height={36} />
                  <Line yAxisId="left" type="monotone" dataKey="sleepHours" name="Sleep (hrs)" stroke="#46735C" strokeWidth={3} dot={{ r: 3, fill: "#211C17" }} />
                  <Line yAxisId="right" type="monotone" dataKey="social" name="Social Connect" stroke="#10B981" strokeWidth={3} dot={{ r: 3, fill: "#211C17" }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-600">{chartTab === "emotion" ? "Lower is calmer. Per-day average of your check-ins." : chartTab === "energy" ? "Each dot is one check-in. Lower distress + higher energy = Vibrant; higher distress + lower energy = Sluggish." : chartTab === "sleep-mood" ? "Sleep hours vs distress. Lower sleep often correlates with higher distress." : "Sleep hours and felt-connection, per day."}</p>
        </div>
      ) : (
        <div className="glass rounded-2xl p-8 text-center text-slate-500 text-sm">Your trend will appear here after a couple of check-ins.</div>
      )}

      {/* Emotion distribution (suffix-stripped counts) */}
      {emoBars.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Emotion log frequency</h2>
          <div className="w-full h-44" role="img" aria-label="Bar chart showing frequency of each emotion logged. Taller bars indicate more frequent emotions.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emoBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                <XAxis dataKey="name" stroke="#948A7E" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#948A7E" fontSize={9} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px" }} itemStyle={{ color: "#5AA483" }} />
                <Bar dataKey="value" fill="#5AA483" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Weekly rhythm: per-day-of-week mood averages */}
      {weeklyBars.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">Weekly rhythm</h2>
          <div className="w-full h-44" role="img" aria-label="Bar chart showing average mood intensity by day of week.">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2922" vertical={false} />
                <XAxis dataKey="day" stroke="#948A7E" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#948A7E" fontSize={9} domain={[1, 10]} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "#171311", borderColor: "#2E2922", borderRadius: "8px" }} labelStyle={{ color: "#ECE5DA" }} />
                <Bar dataKey="avg" name="Avg distress" fill="#D8A657" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-600">Average distress by day of week. Based on {weeklyBars.reduce((s, b) => s + b.count, 0)} check-ins.</p>
        </div>
      )}
    </>
  );
}
