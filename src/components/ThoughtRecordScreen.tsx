import { localDateKey } from "../services/storageUtils";
import { appendToSecureArray } from "../services/secureLocal";
import { SECURE_KEYS } from "../services/secureData";
import React, { useState, useEffect } from "react";
import { ThoughtRecord } from "../types";
import { ChevronLeft, ChevronRight, BrainCircuit, RefreshCw, Check, Brain } from "lucide-react";
import { fetchBalancedThought } from "../services/coachAssist";
import { hapticSuccess } from "../hooks/useHaptics";
import CrisisCard from "./CrisisCard";
import { type ThoughtRecordDraft, mapDraftToWizard } from "../services/thoughtRecordDraft";
import { safeSpotDistortions, distortionSteer } from "../services/distortionSpotter";

const THINKING_TRAPS = [
  { name: "All-or-Nothing", desc: '"If it\'s not perfect, it\'s a complete failure"' },
  { name: "Catastrophising", desc: '"This is going to be an absolute disaster"' },
  { name: "Mind-Reading", desc: '"I already know they think I\'m incompetent"' },
  { name: "Fortune-Telling", desc: '"I know for a fact it will go wrong"' },
  { name: "Emotional Reasoning", desc: '"I feel worthless, so I must genuinely be so"' },
  { name: "Should Statements", desc: '"I should be doing better than this"' },
  { name: "Labelling", desc: '"I\'m a failure / bad person"' },
  { name: "Personalisation", desc: '"It is all entirely my fault"' },
  { name: "Mental Filter", desc: '"Only focus on the negative, screen out positive context"' },
  { name: "Magnification", desc: '"Blowing everything out of proportion"' }
];

export default function ThoughtRecordScreen({ draft }: { draft?: ThoughtRecordDraft } = {}) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  
  // Form fields — pre-filled from draft when provided
  const [situation, setSituation] = useState<string>("");
  const [feeling, setFeeling] = useState<string>("");
  const [initialIntensity, setInitialIntensity] = useState<number>(50);
  const [automaticThought, setAutomaticThought] = useState<string>("");
  const [beliefPercent, setBeliefPercent] = useState<number>(50);
  const [selectedTraps, setSelectedTraps] = useState<string[]>([]);
  const [balancedThought, setBalancedThought] = useState<string>("");
  const [reRatedIntensity, setReRatedIntensity] = useState<number>(50);

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState<boolean>(false);
  const [spotting, setSpotting] = useState<boolean>(false);
  const [distortionNotice, setDistortionNotice] = useState<string | null>(null);

  // Pre-fill from draft on first mount when draft is provided
  useEffect(() => {
    if (!draft) return;
    const w = mapDraftToWizard(draft);
    setSituation(w.situation);
    setFeeling(w.feeling);
    setInitialIntensity(w.initialIntensity);
    setAutomaticThought(w.automaticThought);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTrap = (trapName: string) => {
    setSelectedTraps((prev) =>
      prev.includes(trapName)
        ? prev.filter((t) => t !== trapName)
        : [...prev, trapName]
    );
  };

  // §9-gated distortion spotting — never reframe a crisis disclosure.
  const handleSpotDistortions = async () => {
    if (!automaticThought.trim()) return;
    setSpotting(true);
    setDistortionNotice(null);
    const result = safeSpotDistortions(automaticThought);
    if (!result.ok) {
      setCrisis(true);
    } else if (result.matches.length === 0) {
      setDistortionNotice("No obvious thinking traps spotted — that's okay, this isn't a verdict.");
    } else {
      setDistortionNotice(distortionSteer(result.matches));
    }
    setSpotting(false);
  };

  // §9-gated assist via coachAssist: crisis text never reaches the model (see coachAssist.ts).
  const fetchBalancedThoughtFromCoach = async () => {
    if (!situation || !automaticThought) {
      setAiError("Please explain what happened and what automatic thoughts arose first.");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setCrisis(false);

    try {
      const result = await fetchBalancedThought({
        situation,
        feeling,
        automaticThought,
        beliefPercent,
        selectedTraps,
      });
      if (result.crisis === false) {
        setBalancedThought(result.reply);
      } else {
        setCrisis(true); // §9: surface crisis help here; do not show a reframe
      }
    } catch (err: any) {
      console.error("Failed to generate balanced thought");
      setAiError("I couldn't reach Nila right now. Please draft your own balanced thought or retry.");
    } finally {
      setAiLoading(false);
    }
  };

  const saveRecord = () => {
    const newRecord: ThoughtRecord = {
      id: "tr_" + Date.now(),
      date: localDateKey(),
      situation,
      feeling,
      initialIntensity,
      automaticThought,
      beliefPercent,
      thinkingTraps: selectedTraps,
      balancedThought,
      reRatedIntensity
    };

    appendToSecureArray<ThoughtRecord>(SECURE_KEYS.thoughtRecords, newRecord);

    hapticSuccess();
    setSavedStatus(true);
    setTimeout(() => {
      setSavedStatus(false);
      resetWizard();
    }, 2500);
  };

  const resetWizard = () => {
    setCurrentPage(1);
    setSituation("");
    setFeeling("");
    setInitialIntensity(50);
    setAutomaticThought("");
    setBeliefPercent(50);
    setSelectedTraps([]);
    setBalancedThought("");
    setReRatedIntensity(50);
    setAiError(null);
    setCrisis(false);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto" id="thought-record-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-ink">CBT Thought Record</h1>
          <p className="text-xs text-ink-faint">Challenging automatic cognitive filters</p>
        </div>
        <span className="text-xs font-mono px-3 py-1 bg-card text-ink-muted border border-line rounded-full">
          Step {currentPage} of 5
        </span>
      </div>

      <div className="glass p-5 rounded-2xl relative">
        {/* Step 1: What happened? */}
        {currentPage === 1 && (
          <div className="space-y-4" id="tr-step-1">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider font-mono">
              Step 1: The Situation
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink-2 block">
                What happened?
              </label>
              <textarea
                aria-label="What happened?"
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full h-32 bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-left transition-all resize-none"
                placeholder="Explain the triggering event objective: e.g., 'An argument with a friend at noon about dinner plans...'"
              />
            </div>
          </div>
        )}

        {/* Step 2: Unwanted Feelings */}
        {currentPage === 2 && (
          <div className="space-y-4" id="tr-step-2">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider font-mono">
              Step 2: Core Feeling
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink-2 block">
                  What did you feel?
                </label>
                <input
                  type="text"
                  aria-label="What did you feel?"
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  className="w-full bg-page border border-line rounded-xl px-4 py-3.5 text-sm text-ink-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="e.g. Shame, intense anger, abandonment, panic"
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2">
                    Feeling Intensity?
                  </label>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {initialIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Feeling Intensity?"
                  min="1"
                  max="100"
                  value={initialIntensity}
                  onChange={(e) => setInitialIntensity(parseInt(e.target.value))}
                  className="w-full bg-page accent-blue-500 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Automatic thought */}
        {currentPage === 3 && (
          <div className="space-y-4" id="tr-step-3">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider font-mono">
              Step 3: Unwanted Thought
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2 block">
                    What automatic thoughts went through your mind?
                  </label>
                  <button
                    type="button"
                    onClick={handleSpotDistortions}
                    disabled={spotting || !automaticThought.trim()}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-lg px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>{spotting ? "Looking..." : "Spot traps"}</span>
                  </button>
                </div>
                <textarea
                  aria-label="What automatic thoughts went through your mind?"
                  value={automaticThought}
                  onChange={(e) => setAutomaticThought(e.target.value)}
                  className="w-full h-24 bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                  placeholder="e.g. 'They are leaving me because I am totally toxic and unlovable...'"
                />
                {distortionNotice && (
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-[11px] text-amber-200/90 leading-relaxed whitespace-pre-line">
                    {distortionNotice}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2">
                    How strongly do you believe this thought?
                  </label>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {beliefPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="How strongly do you believe this thought?"
                  min="0"
                  max="100"
                  value={beliefPercent}
                  onChange={(e) => setBeliefPercent(parseInt(e.target.value))}
                  className="w-full bg-page accent-blue-500 h-1.5 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Thinking traps selector */}
        {currentPage === 4 && (
          <div className="space-y-4" id="tr-step-4">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider font-mono">
              Step 4: Identify Trap Cards
            </h3>
            <label className="text-xs text-ink-faint block">
              Which cognitive distortions apply in this moment? Tap all that align:
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1" id="traps-selector">
              {THINKING_TRAPS.map((t) => {
                const isSelected = selectedTraps.includes(t.name);
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => toggleTrap(t.name)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex justify-between items-center ${
                      isSelected
                        ? "bg-blue-500/10 border-blue-500 text-ink"
                        : "bg-page border-line text-ink-faint"
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-ink-2">{t.name}:</span>{" "}
                      <span className="opacity-80 block mt-0.5">{t.desc}</span>
                    </div>
                    {isSelected && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-bold font-mono">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 5: Balanced Thinking */}
        {currentPage === 5 && (
          <div className="space-y-4" id="tr-step-5">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider font-mono">
              Step 5: Reframed Mindset
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2">
                    What is a more balanced thought?
                  </label>
                  <button
                    type="button"
                    onClick={fetchBalancedThoughtFromCoach}
                    disabled={aiLoading}
                    className="text-xs bg-blue-500/10 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 rounded-lg px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>{aiLoading ? "Asking Nila..." : "Ask Nila"}</span>
                  </button>
                </div>

                {/* ── §9 CRISIS surface (deterministic; no reframe shown) ── */}
                {crisis && (
                  <CrisisCard id="tr-crisis" heading="What you wrote matters more than this exercise right now" />
                )}

                <textarea
                  aria-label="What is a more balanced thought?"
                  value={balancedThought}
                  onChange={(e) => setBalancedThought(e.target.value)}
                  className="w-full h-24 bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                  placeholder="Draft an objective re-evaluation or let the assistant generate one for you..."
                />
              </div>

              {aiError && (
                <p className="text-xs text-orange-400 leading-relaxed font-mono">
                  {aiError}
                </p>
              )}

              {/* Rerating Section */}
              <div className="bg-page p-4 rounded-xl border border-slate-850 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-ink-2">
                      Re-rate original emotion intensity now:
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {reRatedIntensity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Re-rate original emotion intensity now:"
                    min="1"
                    max="100"
                    value={reRatedIntensity}
                    onChange={(e) => setReRatedIntensity(parseInt(e.target.value))}
                    className="w-full bg-card accent-emerald-500 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {reRatedIntensity < initialIntensity && (
                  <div className="text-xs text-emerald-400 font-sans flex items-center gap-1 bg-emerald-500/10 p-2 border border-emerald-500/20 rounded-lg">
                    <Check className="w-3.5 h-3.5" />
                    <span>Your feeling intensity reduced by <span className="font-bold">{initialIntensity - reRatedIntensity}%</span> (from {initialIntensity}% to {reRatedIntensity}%)! Reframing thoughts helps calm physical pathways.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-line/80 mt-6 font-medium">
          <button
            onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className={`flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              currentPage === 1 
                ? "text-slate-600 cursor-not-allowed" 
                : "text-ink-faint hover:text-ink-2"
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {currentPage < 5 ? (
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              className="flex items-center gap-1 text-xs font-bold text-ink bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg cursor-pointer transition-all"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={saveRecord}
              className={`text-xs font-bold py-2 px-6 rounded-lg transition-all cursor-pointer ${
                savedStatus
                  ? "bg-emerald-500 text-[#171311] font-extrabold"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {savedStatus ? "Log Saved!" : "Complete Record"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
