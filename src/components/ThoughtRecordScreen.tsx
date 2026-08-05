import { localDateKey } from "../services/storageUtils";
import { appendToSecureArray } from "../services/secureLocal";
import { SECURE_KEYS } from "../services/secureData";
import { useState, useEffect } from "react";
import { ThoughtRecord } from "../types";
import { ChevronLeft, ChevronRight, BrainCircuit, Check, Brain } from "lucide-react";
import { fetchBalancedThought } from "../services/coachAssist";
import { hapticSuccess } from "../hooks/useHaptics";
import CrisisCard from "./CrisisCard";
import { type ThoughtRecordDraft, mapDraftToWizard } from "../services/thoughtRecordDraft";
import { safeSpotDistortions, distortionSteer } from "../services/distortionSpotter";
import { useLanguage, t } from "../services/i18n";

const THINKING_TRAPS = [
  { name: "tr_trap_all_or_nothing", desc: "tr_trap_all_or_nothing_desc" },
  { name: "tr_trap_catastrophising", desc: "tr_trap_catastrophising_desc" },
  { name: "tr_trap_mind_reading", desc: "tr_trap_mind_reading_desc" },
  { name: "tr_trap_fortune_telling", desc: "tr_trap_fortune_telling_desc" },
  { name: "tr_trap_emotional_reasoning", desc: "tr_trap_emotional_reasoning_desc" },
  { name: "tr_trap_should_statements", desc: "tr_trap_should_statements_desc" },
  { name: "tr_trap_labelling", desc: "tr_trap_labelling_desc" },
  { name: "tr_trap_personalisation", desc: "tr_trap_personalisation_desc" },
  { name: "tr_trap_mental_filter", desc: "tr_trap_mental_filter_desc" },
  { name: "tr_trap_magnification", desc: "tr_trap_magnification_desc" }
] as const;

export default function ThoughtRecordScreen({ draft }: { draft?: ThoughtRecordDraft } = {}) {
  useLanguage();
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
      setDistortionNotice(t("tr_no_traps"));
    } else {
      setDistortionNotice(distortionSteer(result.matches));
    }
    setSpotting(false);
  };

  // §9-gated assist via coachAssist: crisis text never reaches the model (see coachAssist.ts).
  const fetchBalancedThoughtFromCoach = async () => {
    if (!situation || !automaticThought) {
      setAiError(t("tr_empty_error"));
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
      setAiError(t("tr_nil_fail"));
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
      {/* 2026-08-05 declutter: in-body h1 (t("tr_title")) removed — both render paths (App.tsx aux Sheet
          "Thought record", CaptureSheets "Thought Record") already title this screen in the Sheet header
          directly above. Subtitle + step pill stay. */}
      <div className="flex justify-between items-center gap-3">
        <p className="text-base text-ink-muted leading-relaxed">{t("tr_subtitle")}</p>
        <span className="text-xs font-mono px-3 py-1 bg-card text-ink-muted border border-line rounded-full shrink-0">
          Step {currentPage}{t("tr_step_of")}
        </span>
      </div>

      <div className="glass p-5 rounded-2xl relative">
        {/* Step 1: What happened? */}
        {currentPage === 1 && (
          <div className="space-y-4" id="tr-step-1">
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider font-mono">
              {t("tr_step1_title")}
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-ink-2 block">
                {t("tr_step1_question")}
              </label>
              <textarea
                aria-label={t("tr_step1_question")}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full h-32 bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent text-left transition-all resize-none"
                placeholder={t("tr_step1_placeholder")}
              />
            </div>
          </div>
        )}

        {/* Step 2: Unwanted Feelings */}
        {currentPage === 2 && (
          <div className="space-y-4" id="tr-step-2">
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider font-mono">
              {t("tr_step2_title")}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-ink-2 block">
                  {t("tr_step2_question")}
                </label>
                <input
                  type="text"
                  aria-label={t("tr_step2_question")}
                  value={feeling}
                  onChange={(e) => setFeeling(e.target.value)}
                  className="w-full bg-page border border-line rounded-xl px-4 py-3.5 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all"
                  placeholder={t("tr_step2_placeholder")}
                />
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2">
                    {t("tr_step2_intensity")}
                  </label>
                  <span className="text-xs font-mono font-bold text-accent">
                    {initialIntensity}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={t("tr_step2_intensity")}
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
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider font-mono">
              {t("tr_step3_title")}
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2 block">
                    {t("tr_step3_question")}
                  </label>
                  <button
                    type="button"
                    onClick={handleSpotDistortions}
                    disabled={spotting || !automaticThought.trim()}
                    className="text-xs bg-warn/10 hover:bg-warn/20 border border-warn/30 text-warn rounded-lg px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>{spotting ? t("tr_spot_looking") : t("tr_spot_traps")}</span>
                  </button>
                </div>
                <textarea
                  aria-label={t("tr_step3_question")}
                  value={automaticThought}
                  onChange={(e) => setAutomaticThought(e.target.value)}
                  className="w-full h-24 bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
                  placeholder={t("tr_step3_placeholder")}
                />
                {distortionNotice && (
                  <div className="bg-warn/5 border border-warn/20 rounded-lg px-3 py-2 text-base text-warn-hi/90 leading-relaxed whitespace-pre-line">
                    {distortionNotice}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2">
                    {t("tr_step3_belief")}
                  </label>
                  <span className="text-xs font-mono font-bold text-accent">
                    {beliefPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label={t("tr_step3_belief")}
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
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider font-mono">
              {t("tr_step4_title")}
            </h3>
            <label className="text-xs text-ink-faint block">
              {t("tr_step4_instruction")}
            </label>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1" id="traps-selector">
              {THINKING_TRAPS.map((trap) => {
                const isSelected = selectedTraps.includes(trap.name);
                return (
                  <button
                    key={trap.name}
                    type="button"
                    onClick={() => toggleTrap(trap.name)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer flex justify-between items-center ${
                      isSelected
                        ? "bg-accent/10 border-accent text-ink"
                        : "bg-page border-line text-ink-faint"
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-ink-2">{t(trap.name)}:</span>{" "}
                      <span className="opacity-80 block mt-0.5">{t(trap.desc)}</span>
                    </div>
                    {isSelected && (
                      <span className="bg-accent text-white text-xs px-2 py-0.5 rounded font-bold font-mono">
                        {t("tr_step4_active")}
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
            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider font-mono">
              {t("tr_step5_title")}
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-ink-2">
                    {t("tr_step5_question")}
                  </label>
                  <button
                    type="button"
                    onClick={fetchBalancedThoughtFromCoach}
                    disabled={aiLoading}
                    className="text-xs bg-accent/10 hover:opacity-90/25 border border-accent/30 text-accent rounded-lg px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>{aiLoading ? t("tr_step5_asking") : t("tr_step5_ask_nila")}</span>
                  </button>
                </div>

                {/* ── §9 CRISIS surface (deterministic; no reframe shown) ── */}
                {crisis && (
                  <CrisisCard id="tr-crisis" heading={t("tr_step5_crisis_heading")} />
                )}

                <textarea
                  aria-label={t("tr_step5_question")}
                  value={balancedThought}
                  onChange={(e) => setBalancedThought(e.target.value)}
                  className="w-full h-24 bg-page border border-line rounded-xl px-4 py-3 text-sm text-ink-2 placeholder-ink-faint focus:outline-none focus:border-accent transition-all resize-none"
                  placeholder={t("tr_step5_placeholder")}
                />
              </div>

              {aiError && (
                <p className="text-base text-orange-400 leading-relaxed font-mono">
                  {aiError}
                </p>
              )}

              {/* Rerating Section */}
              <div className="bg-page p-4 rounded-xl border border-line space-y-4">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-ink-2">
                      {t("tr_step5_reenable")}
                    </label>
                    <span className="text-xs font-mono font-bold text-success">
                      {reRatedIntensity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={t("tr_step5_reenable")}
                    min="1"
                    max="100"
                    value={reRatedIntensity}
                    onChange={(e) => setReRatedIntensity(parseInt(e.target.value))}
                    className="w-full bg-card accent-emerald-500 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {reRatedIntensity < initialIntensity && (
                  <div className="text-xs text-success font-sans flex items-center gap-1 bg-success/10 p-2 border border-success/20 rounded-lg">
                    <Check className="w-3.5 h-3.5" />
                    <span>Your feeling intensity reduced by <span className="font-bold">{initialIntensity - reRatedIntensity}</span>{t("tr_success_message")}</span>
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
            <ChevronLeft className="w-4 h-4" /> {t("tr_btn_back")}
          </button>

          {currentPage < 5 ? (
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              className="flex items-center gap-1 text-xs font-bold text-ink bg-accent hover:opacity-90 px-4 py-2 rounded-lg cursor-pointer transition-all"
            >
              {t("tr_btn_continue")} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={saveRecord}
              className={`text-xs font-bold py-2 px-6 rounded-lg transition-all cursor-pointer ${
                savedStatus
                  ? "bg-success text-[#171311] font-extrabold"
                  : "bg-accent hover:opacity-90 text-white"
              }`}
            >
              {savedStatus ? t("tr_btn_saved") : t("tr_btn_complete")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
