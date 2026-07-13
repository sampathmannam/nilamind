import React, { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import CountdownRing from "./CountdownRing";
import BreathingTimer from "./BreathingTimer";
import PMRTimer from "./PMRTimer";
import {
  getTippSafetyState,
  saveTippSafetyFlags,
  hasTemperatureCaution,
  defaultTippSafetyFlags,
  TIPP_SAFETY_ITEMS,
  type TippSafetyFlags,
} from "../services/tippSafetyGate";

// TIPPTool — one unified interactive TIPP (Temperature, Intense exercise, Paced breathing, Paired
// muscle relaxation) tool, replacing 3 shallow, divergent half-implementations (2026-07-12 Wave 3,
// Group E; see docs/superpowers/plans/2026-07-12-wave3-technical-specs.md §3).
//
// DBT guidance is "use whichever piece fits" — so this is one flow with 4 sub-screens the user can
// jump between (a tab strip), rather than forcing a linear T→I→P→P order. This also naturally handles
// the safety gate: someone flagged off Temperature just starts on Intense exercise instead.
//
// Evidence + safety cautions per component (spec doc §3):
//  T — dive reflex, moderate-large vagal effect (Ackermann et al. 2023); same reflex implicated in
//      autonomic-conflict arrhythmia risk (Shattock & Tipton 2012) — gated by the safety checklist.
//  I — brief/vigorous exercise reduces state anxiety (Petruzzello et al. 1991; Bernstein & McNally
//      2018; Ensari et al. meta-analysis of 36 RCTs, smaller but significant effect).
//  P (breathing) — already built; the app's cyclicSighing preset (≈1:2 exhale:inhale) is the closest
//      match to TIPP's own instruction and is already prioritized for the acute-episode path.
//  P (PMR) — Jacobson (1938); Manzoni et al. (2008, BMC Psychiatry) d≈0.57–0.68, largest within-group
//      effect among relaxation techniques.
//  Honesty gap: no dismantling trial isolates a single TIPP subskill's standalone contribution as a
//      crisis intervention — what exists is strong per-component general-psychophysiology evidence
//      plus whole-module DBT evidence (Neacsiu, Rizvi & Linehan 2010; Linehan et al. 2015, JAMA
//      Psychiatry). Matches the app's existing citation-honesty pattern (data.ts's 5-4-3-2-1 entry,
//      skillsLibrary.ts's Wise Mind entry).

export type TippSubSkill = "temperature" | "exercise" | "breathing" | "pmr";

// Engineering defaults, not citations — spec doc §3 gives ranges (Temperature 30–60s, Intense
// exercise 60–90s); these pick a point in each range.
const TEMPERATURE_MS = 45_000;
const EXERCISE_MS = 75_000;

interface TabDef {
  id: TippSubSkill;
  letter: string;
  label: string;
}

const ALL_TABS: TabDef[] = [
  { id: "temperature", letter: "T", label: "Temperature" },
  { id: "exercise", letter: "I", label: "Intense exercise" },
  { id: "breathing", letter: "P", label: "Paced breathing" },
  { id: "pmr", letter: "P", label: "Paired muscle relaxation" },
];

export interface TIPPToolProps {
  /** Called once each time a sub-skill is marked "tried" — wire into existing skillsUsed/diary
   *  plumbing ("TIPP" is already a valid diary entry per spec; no new persistence work needed here). */
  onSubSkillComplete?: (skill: TippSubSkill) => void;
  /** Called when the user records a fresh 1–10 intensity recheck after Temperature or Intense exercise. */
  onIntensityChange?: (intensity: number) => void;
}

const HONESTY_GAP_COPY =
  "Each piece here is backed by real research on its own (cold water and the dive reflex, brief exercise, slow breathing, tense-release relaxation) — but no single study isolates just one of these as a stand-alone fix for a crisis moment. What's well-tested is the whole approach used together.";

export default function TIPPTool({ onSubSkillComplete, onIntensityChange }: TIPPToolProps = {}) {
  const [safety, setSafety] = useState(() => getTippSafetyState());
  const [tab, setTab] = useState<TippSubSkill | null>(null);
  const [tried, setTried] = useState<Set<TippSubSkill>>(new Set());
  const [intensityPromptFor, setIntensityPromptFor] = useState<TippSubSkill | null>(null);

  const showTemperature = !hasTemperatureCaution(safety.flags);
  const tabs = ALL_TABS.filter((t) => t.id !== "temperature" || showTemperature);

  // Once the checklist is (already, or newly) completed, land on the first available tab.
  useEffect(() => {
    if (safety.completed && tab === null) {
      setTab(showTemperature ? "temperature" : "exercise");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safety.completed, showTemperature]);

  const markTried = (skill: TippSubSkill) => {
    setTried((prev) => new Set(prev).add(skill));
    onSubSkillComplete?.(skill);
    if (skill === "temperature" || skill === "exercise") setIntensityPromptFor(skill);
  };

  const recordIntensity = (n: number) => {
    onIntensityChange?.(n);
    setIntensityPromptFor(null);
  };

  if (!safety.completed) {
    return <TippSafetyChecklist onSubmit={(flags) => setSafety(saveTippSafetyFlags(flags))} />;
  }

  const activeTab = tab ?? (showTemperature ? "temperature" : "exercise");

  return (
    <div className="space-y-4" id="tipp-tool">
      <p className="text-[11px] text-slate-500 leading-relaxed">{HONESTY_GAP_COPY}</p>

      {!showTemperature && activeTab === "exercise" && (
        <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2" id="tipp-temp-skipped-notice">
          Cold water skipped for your safety — try one of these instead.
        </p>
      )}

      <div className="flex bg-slate-800 border border-slate-700 rounded-xl overflow-hidden p-0.5 w-fit" id="tipp-tab-strip">
        {tabs.map((t) => {
          const selected = activeTab === t.id;
          const wasTried = tried.has(t.id);
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={selected}
              aria-label={t.label}
              onClick={() => { setTab(t.id); setIntensityPromptFor(null); }}
              className={`flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                selected ? "bg-blue-500/20 text-blue-300" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="font-bold">{t.letter}</span>
              {wasTried && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400">{tabs.find((t) => t.id === activeTab)?.label}</p>

      {activeTab === "temperature" && showTemperature && (
        <TimedSubSkill
          key="temperature"
          durationMs={TEMPERATURE_MS}
          color="#22D3EE"
          label="Cold water"
          ariaLabel="Cold water countdown"
          description="Splash ice-cold water on your face, hold an ice cube, or press something cold to your neck or wrists — this triggers the mammalian dive reflex (Ackermann et al. 2023)."
          caution="Skip this if you have a cardiac condition, are pregnant, or checked any box on the safety checklist — the same reflex can affect heart rhythm (Shattock & Tipton 2012)."
          tried={tried.has("temperature")}
          intensityPromptOpen={intensityPromptFor === "temperature"}
          onMarkTried={() => markTried("temperature")}
          onIntensity={recordIntensity}
        />
      )}

      {activeTab === "exercise" && (
        <TimedSubSkill
          key="exercise"
          durationMs={EXERCISE_MS}
          color="#FB923C"
          label="Move fast"
          ariaLabel="Intense exercise countdown"
          description="Jumping jacks, running in place, or stair climbing — brief and vigorous, to discharge the sympathetic surge, not a cardio session (Petruzzello et al. 1991; Bernstein & McNally 2018)."
          caution="Ease off if you have a recent injury, a cardiac condition, or are pregnant."
          tried={tried.has("exercise")}
          intensityPromptOpen={intensityPromptFor === "exercise"}
          onMarkTried={() => markTried("exercise")}
          onIntensity={recordIntensity}
        />
      )}

      {activeTab === "breathing" && (
        <div className="space-y-3">
          <BreathingTimer defaultPattern="cyclicSighing" />
          <MarkTriedButton tried={tried.has("breathing")} onClick={() => markTried("breathing")} />
        </div>
      )}

      {activeTab === "pmr" && (
        <div className="space-y-3">
          <PMRTimer onComplete={() => markTried("pmr")} />
          <MarkTriedButton tried={tried.has("pmr")} onClick={() => markTried("pmr")} />
        </div>
      )}
    </div>
  );
}

function MarkTriedButton({ tried, onClick }: { tried: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
        tried ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-page border border-slate-800 text-slate-300 hover:border-slate-600"
      }`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {tried ? "Marked as tried" : "Mark as tried"}
    </button>
  );
}

function TimedSubSkill({
  durationMs,
  color,
  label,
  ariaLabel,
  description,
  caution,
  tried,
  intensityPromptOpen,
  onMarkTried,
  onIntensity,
}: {
  durationMs: number;
  color: string;
  label: string;
  ariaLabel: string;
  description: string;
  caution: string;
  tried: boolean;
  intensityPromptOpen: boolean;
  onMarkTried: () => void;
  onIntensity: (n: number) => void;
}) {
  return (
    <div className="space-y-3">
      <CountdownRing progress={0} label={label} color={color} ariaLabel={ariaLabel} durationMs={durationMs} />
      <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
      <p className="text-[11px] text-amber-300/90 leading-relaxed">{caution}</p>
      <MarkTriedButton tried={tried} onClick={onMarkTried} />
      {intensityPromptOpen && (
        <div className="space-y-2 pt-1" id="tipp-intensity-recheck">
          <p className="text-xs text-slate-500 text-center">Where's your intensity now? (1–10)</p>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => onIntensity(n)}
                className="bg-page border border-slate-800 text-slate-200 hover:border-blue-500 font-bold py-2 rounded-lg text-xs cursor-pointer text-center"
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TippSafetyChecklist({ onSubmit }: { onSubmit: (flags: TippSafetyFlags) => void }) {
  const [flags, setFlags] = useState<TippSafetyFlags>(defaultTippSafetyFlags());

  const toggle = (key: keyof TippSafetyFlags) => setFlags((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-4" id="tipp-safety-checklist">
      <div className="flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-slate-100">Before we start — quick safety check</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            One of TIPP's tools (cold water) briefly changes your heart rhythm on purpose — that's usually
            safe, but not always. Check anything that applies to you; you'll only need to do this once.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {TIPP_SAFETY_ITEMS.map((item) => (
          <label key={item.key} className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={flags[item.key]}
              onChange={() => toggle(item.key)}
              aria-label={item.label}
              className="w-4 h-4 rounded border-slate-700"
            />
            {item.label}
          </label>
        ))}
      </div>

      <button
        onClick={() => onSubmit(flags)}
        className="w-full bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold py-3 rounded-xl text-xs cursor-pointer transition-all"
      >
        Continue
      </button>
    </div>
  );
}
