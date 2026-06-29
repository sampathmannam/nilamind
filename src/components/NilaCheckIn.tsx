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

import React, { useReducer, useRef } from "react";
import type { CheckInEntry } from "../types";
import {
  INITIAL_DRAFT,
  MOOD_CHIPS,
  INTENSITY_CHIPS,
  CONTEXT_TAGS,
  checkinReducer,
  resolveCheckin,
} from "../services/nilaCheckinReducer";
import { buildCheckinEntry, appendCheckin } from "../services/checkin";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface NilaCheckInProps {
  /** Called with the persisted entry after context resolves (step b). */
  onLogged: (entry: CheckInEntry) => void;
  /** Called when user taps "I just want to talk" (top-level skip — step a).
   *  Parent (C2) wires this to set the per-day skip flag via setSkipFlag(). */
  onSkip: () => void;
}

// ─── Step labels for display ─────────────────────────────────────────────────

const STEP_LABELS = { mood: "How are you feeling?", intensity: "How strong is that?", context: "What's on your mind?", done: "" } as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NilaCheckIn({ onLogged, onSkip }: NilaCheckInProps) {
  const [draft, dispatch] = useReducer(checkinReducer, INITIAL_DRAFT);
  // Guard: once we write, ignore any second tap (e.g. double-tap on context chip).
  const doneRef = useRef(false);

  // ── Chip handlers ──────────────────────────────────────────────────────────

  const handleMood = (label: string) => {
    dispatch({ type: "pickMood", label });
  };

  const handleIntensity = (value: number) => {
    dispatch({ type: "pickIntensity", intensity: value });
  };

  const handleContext = (tag: string | null) => {
    if (doneRef.current) return;
    const action = { type: "pickContext" as const, tag };
    const resolved = resolveCheckin(draft, action);
    if (!resolved) return; // guard: shouldn't happen in normal flow
    doneRef.current = true;
    const entry = buildCheckinEntry(resolved.label, resolved.intensity, resolved.contextTag);
    appendCheckin(entry);
    dispatch(action);
    onLogged(entry);
  };

  // ── Progress indicator ─────────────────────────────────────────────────────

  const steps = ["mood", "intensity", "context"] as const;
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
        <h1 className="text-lg font-bold text-slate-100">
          {STEP_LABELS[draft.step]}
        </h1>
        {/* Top-level skip — writes NO CheckInEntry */}
        {draft.step === "mood" && (
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2 cursor-pointer transition-colors"
            id="nila-checkin-skip-to-talk"
          >
            I just want to talk
          </button>
        )}
      </header>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-1.5" aria-label="Check-in progress">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`rounded-full transition-all ${
              i === stepIdx
                ? "w-6 h-1.5 bg-violet-500"
                : i < stepIdx
                ? "w-4 h-1.5 bg-emerald-500"
                : "w-4 h-1.5 bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="bg-card border border-slate-800 rounded-2xl p-5 space-y-3">

        {/* ── Step 1: Mood chips ── */}
        {draft.step === "mood" && (
          <div className="grid grid-cols-2 gap-2" id="nila-mood-grid">
            {MOOD_CHIPS.map((m) => (
              <button
                key={m}
                onClick={() => handleMood(m)}
                className={`py-3 rounded-xl text-sm font-medium border cursor-pointer transition-all active:scale-95 ${
                  draft.label === m
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-200"
                    : "bg-page border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100"
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
                    ? "bg-violet-600/20 border-violet-500/50 text-violet-200"
                    : "bg-page border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100"
                }`}
              >
                <span className="block font-semibold">{chip.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{chip.value}/10</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 3: Context chips + skip ── */}
        {draft.step === "context" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2" id="nila-context-grid">
              {CONTEXT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleContext(tag)}
                  className="py-2.5 rounded-xl text-sm font-medium border border-slate-800 bg-page text-slate-300 hover:border-slate-700 hover:text-slate-100 cursor-pointer transition-all active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
            {/* Step-3 context skip — resolves check-in with contextTag=null, writes entry */}
            <button
              onClick={() => handleContext(null)}
              id="nila-checkin-skip-context"
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-slate-800 bg-card text-slate-400 hover:text-slate-200 cursor-pointer transition-all"
            >
              Skip context
            </button>
          </div>
        )}
      </div>

      {/* Mood label in sub-steps for context */}
      {(draft.step === "intensity" || draft.step === "context") && draft.label && (
        <p className="text-xs text-center text-slate-500">
          Feeling: <span className="text-slate-300 font-medium">{draft.label}</span>
          {draft.intensity !== null && (
            <> · Intensity: <span className="text-slate-300 font-medium">{draft.intensity}/10</span></>
          )}
        </p>
      )}
    </div>
  );
}
