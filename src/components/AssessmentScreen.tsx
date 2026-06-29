import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  INSTRUMENTS,
  InstrumentId,
  Instrument,
  scoreAssessment,
  ScoredResult,
  AssessmentEntry,
  loadAssessments,
  saveAssessment,
  assessmentsFor,
  latestFor,
  daysSince,
} from "../services/assessments";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  ClipboardCheck,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Phone,
  Info,
  Check,
  Activity,
  Volume2,
} from "lucide-react";
import CrisisLines from "./CrisisLines";
import { speak } from "../services/voice";
import { resolveInitialInstrument } from "./assessmentInitial";

// Static class strings per severity tone — written out in full so Tailwind's scanner keeps them.
const TONE: Record<
  string,
  { text: string; bg: string; border: string; bar: string; stroke: string }
> = {
  emerald: { text: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/40", bar: "bg-emerald-500", stroke: "#10b981" },
  sky: { text: "text-sky-300", bg: "bg-sky-500/10", border: "border-sky-500/40", bar: "bg-sky-500", stroke: "#38bdf8" },
  amber: { text: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/40", bar: "bg-amber-500", stroke: "#CE9A3A" },
  orange: { text: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/40", bar: "bg-orange-500", stroke: "#E3A57D" },
  rose: { text: "text-rose-300", bg: "bg-rose-500/10", border: "border-rose-500/40", bar: "bg-rose-500", stroke: "#B5614E" },
};

// Static Tailwind grid classes per response-scale width (PHQ/GAD=4, PSS-4=5, WHO-5=6).
const COLS: Record<number, string> = { 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6" };

interface Props {
  onActivateCrisis: () => void;
  /** When supplied the screen skips the menu and launches directly into the named instrument.
   *  The prop is read once on mount via a ran-once useEffect; changing it after mount has no effect.
   *  The existing `<AssessmentScreen onActivateCrisis={...} />` call site (no initialInstrument)
   *  remains valid — this prop is optional. */
  initialInstrument?: InstrumentId;
}

export default function AssessmentScreen({ onActivateCrisis, initialInstrument }: Props) {
  const [phase, setPhase] = useState<"menu" | "running" | "result">("menu");
  const [active, setActive] = useState<InstrumentId | null>(null);
  const [responses, setResponses] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<ScoredResult | null>(null);
  const [history, setHistory] = useState<AssessmentEntry[]>([]);

  useEffect(() => {
    setHistory(loadAssessments());
  }, []);

  const startInstrument = (id: InstrumentId) => {
    setActive(id);
    setResponses(new Array(INSTRUMENTS[id].items.length).fill(null));
    setResult(null);
    setPhase("running");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // When launched from a Nila screening card or the Tools "Screenings" entry with a specific
  // instrument, skip the menu and start it directly. Runs once; re-renders never restart it.
  const startedInitial = useRef(false);
  useEffect(() => {
    if (startedInitial.current) return;
    const id = resolveInitialInstrument(initialInstrument);
    if (id) {
      startedInitial.current = true;
      startInstrument(id);
    }
    // Intentionally depends only on initialInstrument: startInstrument is a stable local closure
    // and the startedInitial guard makes this a one-shot launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialInstrument]);

  const inst: Instrument | null = active ? INSTRUMENTS[active] : null;

  const answer = (itemIdx: number, value: number) => {
    setResponses((prev) => {
      const next = [...prev];
      next[itemIdx] = value;
      return next;
    });
  };

  const answeredCount = responses.filter((r) => r !== null).length;
  const allAnswered = inst != null && answeredCount === inst.items.length;

  const submit = () => {
    if (!inst || !allAnswered) return;
    const nums = responses.map((r) => r ?? 0);
    const scored = scoreAssessment(inst.id, nums);
    const now = new Date();
    const entry: AssessmentEntry = {
      id: "as_" + Date.now(),
      date: now.toISOString().split("T")[0],
      timestamp: now.toLocaleTimeString(),
      instrument: inst.id,
      responses: nums,
      total: scored.total,
      severity: scored.band.label,
      safetyFlag: scored.safetyFlag,
    };
    setHistory(saveAssessment(entry));
    setResult(scored);
    setPhase("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── MENU ──────────────────────────────────────────────────────────────────
  if (phase === "menu") {
    return (
      <div className="space-y-5 max-w-md mx-auto" id="assessment-screen">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-blue-400" /> Validated Check-Ins
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Short, research-validated check-ins — depression (PHQ-9 / quick PHQ-2), anxiety (GAD-7),
            wellbeing (WHO-5) and stress (PSS-4). They turn a vague "I feel worse" into something you
            can actually see move.
          </p>
        </header>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 flex gap-2.5">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            These are <span className="text-slate-200 font-semibold">screening tools, not a diagnosis</span>.
            A high score is a reason to talk to a professional — not a verdict about who you are. They
            ask about the last week or two, so taking them weekly or fortnightly is plenty; daily won't tell you more.
          </p>
        </div>

        {(Object.keys(INSTRUMENTS) as InstrumentId[]).map((id) => {
          const it = INSTRUMENTS[id];
          const last = latestFor(id, history);
          const since = daysSince(last);
          const tone = last ? TONE[it.bands.find((b) => last.total >= b.min && last.total <= b.max)?.tone ?? "sky"] : null;
          return (
            <button
              key={id}
              onClick={() => startInstrument(id)}
              id={`assessment-start-${id}`}
              className="w-full bg-card border border-slate-800 hover:border-slate-700 hover:bg-raised p-4 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-100">{it.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">{it.measures}</span>
                </div>
                <p className="text-[11px] text-slate-400">{it.fullName}</p>
                {last && tone ? (
                  <p className="text-[11px] text-slate-500">
                    Last: <span className={`font-semibold ${tone.text}`}>{last.total}/{it.maxScore} · {last.severity}</span>
                    {since !== null && <span className="text-slate-600"> · {since === 0 ? "today" : `${since}d ago`}</span>}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-600">Not taken yet · ~{it.items.length * 8}s</p>
                )}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-600 shrink-0" />
            </button>
          );
        })}

        {/* Per-instrument trend history */}
        {(Object.keys(INSTRUMENTS) as InstrumentId[]).map((id) => (
          <TrendBlock key={id} instrumentId={id} history={history} />
        ))}
      </div>
    );
  }

  // ── RUNNING ───────────────────────────────────────────────────────────────
  if (phase === "running" && inst) {
    return (
      <div className="space-y-4 max-w-md mx-auto" id="assessment-running">
        <button
          onClick={() => { setPhase("menu"); setActive(null); }}
          className="text-xs font-semibold text-slate-400 hover:text-slate-100 flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Cancel
        </button>

        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-100">{inst.name}</h2>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">{inst.measures}</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed bg-card border border-slate-800 rounded-xl p-3">
            {inst.prompt}
          </p>
          {inst.safetyItemIndex !== undefined && (
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Answer as honestly as you can. If anything hard comes up while you answer, the red anchor
              button is always one tap away.
            </p>
          )}
        </header>

        {/* Anchor legend */}
        <div className={`grid ${COLS[inst.responseOptions.length] ?? "grid-cols-4"} gap-1.5 sticky top-0 bg-page py-2 z-10`}>
          {inst.responseOptions.map((a, i) => (
            <div key={i} className="text-center">
              <div className="text-[10px] font-mono text-slate-500">{i}</div>
              <div className="text-[8px] text-slate-600 leading-tight">{a}</div>
            </div>
          ))}
        </div>

        {/* Items */}
        <div className="space-y-3">
          {inst.items.map((item, idx) => {
            const isSafety = inst.safetyItemIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl p-3.5 border ${responses[idx] !== null ? "bg-card border-slate-700" : "bg-card border-slate-800"}`}
                id={`assessment-item-${idx}`}
              >
                <div className="flex gap-2 mb-3">
                  <span className="text-[11px] font-mono text-slate-600 shrink-0">{idx + 1}.</span>
                  <p className={`text-xs leading-relaxed ${isSafety ? "text-slate-200" : "text-slate-300"}`}>{item}</p>
                </div>
                <div className={`grid ${COLS[inst.responseOptions.length] ?? "grid-cols-4"} gap-1.5`}>
                  {inst.responseOptions.map((opt, val) => {
                    const selected = responses[idx] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => answer(idx, val)}
                        className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          selected
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-page border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                        aria-label={opt}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 bg-gradient-to-t from-page via-page to-transparent pt-4 pb-2">
          <button
            onClick={submit}
            disabled={!allAnswered}
            id="assessment-submit"
            className="w-full font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-500 text-white disabled:bg-slate-800 disabled:text-slate-500"
          >
            {allAnswered ? (
              <><Check className="w-4 h-4" /> See my result</>
            ) : (
              `Answer all ${inst.items.length} (${answeredCount}/${inst.items.length})`
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (phase === "result" && inst && result) {
    const tone = TONE[result.band.tone];
    // "Concern" side of the cut-point: below it for higher-is-better scales (WHO-5), above it otherwise.
    const overCut = inst.higherIsBetter ? result.total <= inst.cutPoint.score : result.total >= inst.cutPoint.score;
    return (
      <div className="space-y-4 max-w-md mx-auto" id="assessment-result">
        {/* Safety banner first if PHQ-9 item 9 endorsed */}
        {result.safetyFlag && (
          <div className="bg-rose-500/10 border border-rose-500/40 rounded-2xl p-4 space-y-3" id="assessment-safety-banner">
            <div className="flex items-center gap-2 text-rose-300">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold">You're not alone in this</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You marked having had thoughts of being better off dead or of hurting yourself. That
              takes honesty, and it matters. Please consider reaching out right now — to someone you
              trust, or to a trained listener who is available 24/7:
            </p>
            <CrisisLines tone="rose" compact />
            <button
              onClick={onActivateCrisis}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-sm cursor-pointer transition-colors"
            >
              Open my Safety Plan & crisis tools
            </button>
          </div>
        )}

        {/* Score card */}
        <div className={`rounded-2xl p-5 border ${tone.bg} ${tone.border} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400">{inst.name} · {inst.measures}</span>
            <span className="text-[10px] text-slate-500">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-4xl font-black ${tone.text}`}>{result.total}</span>
            <span className="text-sm text-slate-500 mb-1">/ {inst.maxScore}</span>
            <span className={`ml-auto text-sm font-bold ${tone.text}`}>{result.band.label}</span>
          </div>
          {/* severity bar */}
          <div className="h-2 rounded-full bg-page overflow-hidden">
            <div className={`h-full ${tone.bar} rounded-full transition-all`} style={{ width: `${Math.round((result.total / inst.maxScore) * 100)}%` }} />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{result.band.interpretation}</p>
        </div>

        {/* Cut-point + citation */}
        <div className="bg-card border border-slate-800 rounded-xl p-4 space-y-2">
          {overCut && (
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-300 leading-relaxed">{inst.cutPoint.note}</p>
            </div>
          )}
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <span className="text-slate-400 font-semibold">Not a diagnosis.</span> This is a validated
            screening questionnaire. Only a qualified professional can diagnose — but they use exactly
            these scores as a starting point. Source: {inst.citation}
          </p>
        </div>

        <button
          onClick={() => speak(`Your ${inst.name} score is ${result.total} out of ${inst.maxScore}. ${result.band.label}. ${result.band.interpretation}`)}
          id="assessment-read-aloud"
          className="w-full bg-card border border-slate-800 hover:bg-raised text-slate-300 text-xs font-semibold py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5" /> Read this aloud
        </button>

        {inst.id === "PHQ-2" && result.total >= inst.cutPoint.score && (
          <button
            onClick={() => startInstrument("PHQ-9")}
            id="phq2-escalate-phq9"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer transition-colors"
          >
            Take the full PHQ-9 now →
          </button>
        )}

        <button
          onClick={() => { setPhase("menu"); setActive(null); }}
          className="w-full bg-card border border-slate-800 hover:bg-raised text-slate-200 font-semibold py-3 rounded-xl text-sm cursor-pointer transition-colors"
        >
          Done
        </button>

        <TrendBlock instrumentId={inst.id} history={history} />
      </div>
    );
  }

  return null;
}

// ── Trend chart for one instrument ────────────────────────────────────────────
function TrendBlock({ instrumentId, history }: { instrumentId: InstrumentId; history: AssessmentEntry[] }) {
  const inst = INSTRUMENTS[instrumentId];
  const data = useMemo(() => {
    return assessmentsFor(instrumentId, history).map((a) => ({
      date: a.date.slice(5), // MM-DD
      score: a.total,
    }));
  }, [instrumentId, history]);

  if (data.length < 2) return null;

  return (
    <div className="bg-card border border-slate-800 rounded-2xl p-4 space-y-2">
      <h4 className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
        {inst.name} trend · last {data.length}
      </h4>
      <div className="h-36 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#948A7E" }} stroke="#2E2922" />
            <YAxis domain={[0, inst.maxScore]} tick={{ fontSize: 9, fill: "#948A7E" }} stroke="#2E2922" width={24} />
            <Tooltip
              contentStyle={{ background: "#171311", border: "1px solid #2E2922", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#A89D90" }}
            />
            <ReferenceLine
              y={inst.cutPoint.score}
              stroke="#CE9A3A"
              strokeDasharray="4 4"
              label={{ value: "threshold", fontSize: 8, fill: "#CE9A3A", position: "insideTopRight" }}
            />
            <Line type="monotone" dataKey="score" stroke="#46735C" strokeWidth={2} dot={{ r: 3, fill: "#46735C" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-slate-600">Dashed line = screening threshold ({inst.cutPoint.score}). {inst.higherIsBetter ? "Higher is better." : "Lower is calmer."}</p>
    </div>
  );
}
