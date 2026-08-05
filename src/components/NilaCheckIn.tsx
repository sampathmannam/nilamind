/**
 * NilaCheckIn — 3-tap opening check-in UI for the conversational redesign.
 *
 * Step flow:  mood chips → intensity chips → context chips (+ skip)
 * State machine is in nilaCheckinReducer.ts (pure, fully unit-tested).
 * Persistence is via checkin.ts (buildCheckinEntry + appendCheckin).
 *
 * SKIPS:
 *   (a) Top-level "I just want to talk" link → calls onSkip() — writes NO CheckInEntry.
 *   (b) Step-3 "Skip context" button → resolves with contextTag=null → writes one CheckInEntry.
 *
 * Exactly ONE CheckInEntry is written per completed check-in, only when the context step
 * resolves (via resolveCheckin returning non-null).
 *
 * MANUAL VERIFICATION CHECKLIST (RTL not collected by Vitest node environment):
 *   1. Renders "I just want to talk" link at mood step; clicking it calls onSkip and does NOT
 *      write a CheckInEntry to nilamind_checkins.
 *   2. Mood chips: all 7 contract values render (Calm, Okay, Low, Anxious, Angry, Numb,
 *      Overwhelmed). Tapping one highlights it and advances to intensity step.
 *   3. Intensity chips: 4 chips render (Gentle, Noticeable, Strong, Intense). Tapping one
 *      highlights it and advances to context step.
 *   4. Context chips: 7 tags + "Skip context" button render. Tapping a tag calls
 *      appendCheckin once and then onLogged(entry). Tapping "Skip context" also calls
 *      appendCheckin once (contextTag=null) and then onLogged(entry).
 *   5. Progress dots: 3 dots; current step dot is larger/brighter; completed steps are
 *      visually distinct.
 *   6. No double-writes: rapidly tapping context writes exactly one entry (doneRef guard).
 */

import { useReducer, useRef, useMemo, useEffect, useState } from "react";
import type { CheckInEntry } from "../types";
import {
  INITIAL_DRAFT,
  MOOD_CHIPS,
  INTENSITY_CHIPS,
  SLEEP_CHIPS,
  ENERGY_CHIPS,
  CONTEXT_TAGS,
  checkinReducer,
  resolveCheckin,
} from "../services/nilaCheckinReducer";
import { buildCheckinEntry, appendCheckin, loadCheckins } from "../services/checkin";
import { readEpisodeMarkers } from "../services/episodeMarker";
import { loadAssessments } from "../services/assessments";
import { hapticSuccess } from "../hooks/useHaptics";
import { checkAchievementConditions } from "../services/achievements";
import { secureLocal } from "../services/secureLocal";
import { suggestGranularEmotions } from "../services/emotionGranularity";
import { Mic, MicOff } from "lucide-react";
import { listenOnce, stopListening } from "../services/voice";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NilaCheckInProps {
  /** Called with the persisted entry after context resolves (step b). */
  onLogged: (entry: CheckInEntry) => void;
  /** Called when user taps "I just want to talk" (top-level skip — step a).
   *  Parent (C2) wires this to set the per-day skip flag via setSkipFlag(). */
  onSkip: () => void;
}

// ─── Step labels for display ─────────────────────────────────────────────────

const STEP_LABELS = { mood: "How are you feeling?", intensity: "How strong is that?", sleep: "How did you sleep? (optional)", energy: "How's your energy? (optional)", context: "What's on your mind? (optional)", granularity: "Name it more precisely (optional)", done: "" } as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NilaCheckIn({ onLogged, onSkip }: NilaCheckInProps) {
  const [draft, dispatch] = useReducer(checkinReducer, INITIAL_DRAFT);
  const doneRef = useRef(false);
  const [voiceListening, setVoiceListening] = useState(false);

  const suggestions = useMemo(
    () => (draft.step === "granularity" && draft.label ? suggestGranularEmotions(draft.label) : []),
    [draft.step, draft.label],
  );

  const handleMood = (label: string) => { dispatch({ type: "pickMood", label }); };
  const handleIntensity = (value: number) => { dispatch({ type: "pickIntensity", intensity: value }); };
  const handleEnergy = (value: number) => { dispatch({ type: "pickEnergy", energy: value }); };
  const handleSleep = (value: number | null) => { dispatch({ type: "pickSleep", sleepHours: value }); };

  const handleContext = (tag: string | null) => {
    dispatch({ type: "pickContext", tag });
  };

  const resolveAndPersist = (resolved: ReturnType<typeof resolveCheckin>) => {
    if (!resolved || doneRef.current) return;
    doneRef.current = true;
    const entry = buildCheckinEntry(resolved.label, resolved.intensity, resolved.contextTag, resolved.granularEmotion, resolved.energy, resolved.sleepHours);
    appendCheckin(entry);
    hapticSuccess(); // UX-5: tactile confirmation on check-in complete

    // Retention: check and unlock achievements on every check-in
    try {
      const checkinCount = (() => {
        try {
          return loadCheckins().length;
        } catch { return 0; }
      })();
      const hasEpisodeMarkers = (() => {
        try { return readEpisodeMarkers().length > 0; } catch { return false; }
      })();
      const hasSafetyPlan = (() => {
        try { return !!secureLocal.getItem("nilamind_safetyplan"); } catch { return false; }
      })();
      const hasCaregiverContact = (() => {
        try { return !!secureLocal.getItem("nilamind_caregiver_contacts"); } catch { return false; }
      })();
      const hasWellbeingCheck = (() => {
        try { return loadAssessments().length > 0; } catch { return false; }
      })();
      checkAchievementConditions({
        checkinCount,
        streakDays: 0, // streak computed separately
        hasEpisodeMarkers,
        hasSafetyPlan,
        hasCaregiverContact,
        hasWellbeingCheck,
        hasUsedTool: true, // completing a check-in IS using a tool
      });
    } catch { /* best-effort */ }
    onLogged(entry);
  };

  const handleGranular = (emotion: string) => {
    const action = { type: "pickGranular" as const, emotion };
    const resolved = resolveCheckin(draft, action);
    resolveAndPersist(resolved);
    dispatch(action);
  };

  const handleSkipGranular = () => {
    const action = { type: "skipGranular" as const };
    const resolved = resolveCheckin(draft, action);
    resolveAndPersist(resolved);
    dispatch(action);
  };

  // Design review 2026-07-18: the check-in advertised "2 taps" but forced six steps (mood → intensity →
  // sleep → energy → context → granularity). Only mood + intensity are mandatory; the rest are optional
  // enrichment. finishNow() persists a complete entry from whatever the user has entered so far (label +
  // intensity are guaranteed non-null past the intensity step), letting them finish in two taps at any
  // optional step. Sleep/energy/context stay available for anyone who wants them — the clinical signals
  // aren't removed, just no longer compulsory.
  const finishNow = () => {
    if (draft.label === null || draft.intensity === null) return;
    resolveAndPersist({
      label: draft.label,
      intensity: draft.intensity,
      sleepHours: draft.sleepHours,
      energy: draft.energy,
      contextTag: draft.contextTag,
      granularEmotion: draft.granularEmotion,
    });
  };

  const OPTIONAL_STEPS: ReadonlyArray<string> = ["sleep", "energy", "context", "granularity"];
  const isOptionalStep = OPTIONAL_STEPS.includes(draft.step);

  const handleVoiceGranular = async () => {
    if (voiceListening) {
      setVoiceListening(false);
      stopListening();
      return;
    }
    setVoiceListening(true);
    try {
      const text = await listenOnce();
      if (text && text.trim()) {
        handleGranular(text.trim());
      }
    } catch {
      // best-effort
    } finally {
      setVoiceListening(false);
    }
  };

  // #10 (audit): the granularity step (and its only Skip button) renders nothing when there are no
  // suggestions, so a mood with no granular family would dead-end the mandatory opening check-in with a
  // blank card. Belt-and-suspenders on top of the familyForBroad fix: auto-complete the check-in whenever
  // we reach granularity with zero suggestions, so NO current or future mood can ever trap the user.
  useEffect(() => {
    if (draft.step === "granularity" && suggestions.length === 0) {
      handleSkipGranular();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.step, suggestions.length]);

  const steps = ["mood", "intensity", "sleep", "energy", "context", "granularity"] as const;
  const stepIdx = steps.indexOf(draft.step as (typeof steps)[number]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (draft.step === "done") {
    // Parent takes over immediately via onLogged; this is just a brief guard render.
    return null;
  }

  return (
    <div className="space-y-5 max-w-md mx-auto" id="nila-checkin">
      {/* Header */}
      <header className="space-y-1 text-center">
        <h1 className="text-lg font-bold text-ink">
          {STEP_LABELS[draft.step]}
        </h1>
        {/* Top-level skip — writes NO CheckInEntry */}
        {draft.step === "mood" && (
          <button
            onClick={onSkip}
            className="text-xs text-ink-muted hover:text-ink-2 underline underline-offset-2 cursor-pointer transition-colors inline-flex items-center justify-center min-h-[44px] px-2"
            id="nila-checkin-skip-to-talk"
          >
            I just want to talk
          </button>
        )}
      </header>

      {/* Progress — honest about what's required (design review 2026-07-18): two mandatory taps (mood,
          intensity), then everything else is optional. Two solid dots for the required steps, then a soft
          "optional" segment, rather than six equal dots that read as a six-step gauntlet. */}
      <div role="group" className="flex items-center justify-center gap-1.5" aria-label={isOptionalStep ? "Core check-in complete — optional detail" : `Step ${stepIdx + 1} of 2`}>
        {["mood", "intensity"].map((s) => {
          const i = steps.indexOf(s as (typeof steps)[number]);
          const cls =
            i === stepIdx
              ? "w-6 h-1.5 bg-accent" // current mandatory step
              : i < stepIdx
              ? "w-4 h-1.5 bg-success" // completed
              : "w-4 h-1.5 bg-line-strong"; // upcoming
          return <span key={s} className={`rounded-full transition-all ${cls}`} />;
        })}
        {isOptionalStep && (
          <span className="ml-1 text-xs text-ink-faint font-medium">optional detail</span>
        )}
      </div>

      {/* Step content */}
      <div className="glass rounded-2xl p-5 space-y-3">

        {/* ── Step 1: Mood chips ── */}
        {draft.step === "mood" && (
          <div className="grid grid-cols-2 gap-2" id="nila-mood-grid">
            {MOOD_CHIPS.map((m) => (
              <button
                key={m}
                onClick={() => handleMood(m)}
                className={`py-3 rounded-xl text-sm font-medium border cursor-pointer transition-all active:scale-95 ${
                  draft.label === m
                    ? "bg-accent/20 border-accent/50 text-accent-hi"
                    : "bg-page border-line text-ink-2 hover:border-line-strong hover:text-ink"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2: Intensity chips ── */}
        {draft.step === "intensity" && (
          <div className="grid grid-cols-2 gap-2" id="nila-intensity-grid">
            {INTENSITY_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleIntensity(chip.value)}
                className={`py-3 rounded-xl text-sm font-medium border cursor-pointer transition-all active:scale-95 ${
                  draft.intensity === chip.value
                    ? "bg-accent/20 border-accent/50 text-accent-hi"
                    : "bg-page border-line text-ink-2 hover:border-line-strong hover:text-ink"
                }`}
              >
                <span className="block font-semibold">{chip.label}</span>
                <span className="block text-xs text-ink-faint mt-0.5">{chip.value}/10</span>
              </button>
            ))}
          </div>
        )}

         {/* ── Step 2b: Sleep chips (research: sleep is the #1 bipolar prodrome signal) ── */}
         {draft.step === "sleep" && (
           <div className="grid grid-cols-2 gap-2" id="nila-sleep-grid">
             {SLEEP_CHIPS.map((chip) => (
               <button
                 key={chip.label}
                 onClick={() => handleSleep(chip.value)}
                 className={`py-3 rounded-xl text-sm font-medium border cursor-pointer transition-all active:scale-95 ${
                   draft.sleepHours === chip.value
                     ? "bg-accent/20 border-accent/50 text-accent-hi"
                     : "bg-page border-line text-ink-2 hover:border-line-strong hover:text-ink"
                 }`}
               >
                 {chip.label}
               </button>
             ))}
           </div>
         )}

         {/* ── Step 3: Energy chips ── */}
        {draft.step === "energy" && (
          <div className="grid grid-cols-2 gap-2" id="nila-energy-grid">
            {ENERGY_CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleEnergy(chip.value)}
                className={`py-3 rounded-xl text-sm font-medium border cursor-pointer transition-all active:scale-95 ${
                  draft.energy === chip.value
                    ? "bg-accent/20 border-accent/50 text-accent-hi"
                    : "bg-page border-line text-ink-2 hover:border-line-strong hover:text-ink"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Step 4: Context chips (optional) ── */}
        {draft.step === "context" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2" id="nila-context-grid">
              {CONTEXT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleContext(tag)}
                  className="py-2.5 rounded-xl text-sm font-medium border border-line bg-page text-ink-2 hover:border-line-strong hover:text-ink cursor-pointer transition-all active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Optional-step finish control (design review 2026-07-18): a single primary "Done" on every
            optional step so the whole check-in can end in two taps. Persists whatever's been entered.
            Rendered for sleep/energy/context; granularity keeps its own Say-it/Skip row below. */}
        {(draft.step === "sleep" || draft.step === "energy" || draft.step === "context") && (
          <button
            onClick={finishNow}
            id="nila-checkin-done"
            className="w-full mt-1 py-3 rounded-xl text-sm font-bold bg-accent hover:opacity-90 text-white cursor-pointer transition-colors active:scale-95"
          >
            Done — that's enough
          </button>
        )}

        {/* ── Step 5: Granularity — precise emotion naming ── */}
        {draft.step === "granularity" && suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-base text-ink-muted leading-relaxed">
              Research shows that naming feelings more precisely helps us process them better. Which word fits best?
            </p>
            <div className="grid grid-cols-1 gap-2" id="nila-granularity-grid">
              {suggestions.map((word) => (
                <button
                  key={word}
                  onClick={() => handleGranular(word)}
                  className="py-3 rounded-xl text-sm font-medium border border-line bg-page text-ink-2 hover:border-accent/50 hover:text-accent-hi cursor-pointer transition-all active:scale-95"
                >
                  {word}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleVoiceGranular}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border cursor-pointer transition-all ${
                  voiceListening
                    ? "bg-rose-500/20 border-rose-500/50 text-rose-300 animate-pulse"
                    : "border-line-strong bg-card text-ink-muted hover:text-ink-2 hover:border-slate-600"
                }`}
                aria-label={voiceListening ? "Stop listening" : "Say it in your own words"}
              >
                {voiceListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {voiceListening ? "Listening — tap to stop" : "Say it"}
              </button>
              <button
                onClick={handleSkipGranular}
                id="nila-checkin-skip-granular"
                className="py-2.5 px-4 rounded-xl text-sm font-medium border border-line bg-card text-ink-muted hover:text-ink-2 cursor-pointer transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mood label in sub-steps for context */}
      {(draft.step === "intensity" || draft.step === "sleep" || draft.step === "energy" || draft.step === "context") && draft.label && (
        <p className="text-xs text-center text-ink-faint">
          Feeling: <span className="text-ink-2 font-medium">{draft.label}</span>
          {draft.intensity !== null && (
            <> · Intensity: <span className="text-ink-2 font-medium">{draft.intensity}/10</span></>
          )}
          {draft.sleepHours !== null && (
            <> · Sleep: <span className="text-ink-2 font-medium">{draft.sleepHours}h</span></>
          )}
          {draft.energy !== null && (
            <> · Energy: <span className="text-ink-2 font-medium">{draft.energy}/4</span></>
          )}
        </p>
      )}
    </div>
  );
}
