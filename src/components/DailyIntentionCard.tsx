import { forwardRef, useImperativeHandle, useState } from "react";
import { Target, Check, ChevronRight } from "lucide-react";
import { getDailyIntention, setDailyIntention, type DailyIntention } from "../services/weeklyIntention";
import { hapticMedium } from "../hooks/useHaptics";

export interface DailyIntentionCardHandle {
  /** Open the if-then form inline (used by the Today hero when it promotes setting the intention). */
  open: () => void;
}

interface DailyIntentionCardProps {
  // When false, the card stays silent while closed & unset — used when the Today hero is already
  // showing its own "Set today's intention" CTA, so we don't render a duplicate prompt. The hero
  // opens the form via the imperative `open()` handle instead. Defaults to true so the card is
  // self-sufficient anywhere else (e.g. night/elevated, when the hero promotes something else).
  promptWhenClosed?: boolean;
  // When true, the if-then form starts expanded (if no intention is set yet) instead of collapsed.
  // Used in the diary card's Part 3, where the picker is part of an already-open form flow rather
  // than a hub tile that shouldn't dominate the screen.
  defaultOpen?: boolean;
}

// Wave 3 Group I (2026-07-12) — the if-then ("implementation intention") picker that replaces
// the free-text diary "Morning Intention" field (DiaryCardScreen.tsx) and the chat-embedded
// "What's your intention for today?" question (modeEngine.ts) with the ONE canonical structured
// store (weeklyIntention.ts's daily intention). Specific/structured plans outperform vague/open
// prompts at producing follow-through: d=0.65 on goal attainment generally, d=0.61 specifically on
// overcoming failure-to-start, per Gollwitzer & Sheeran (2006), Adv Exp Soc Psychol.
//
// The if-then FORM is collapsed by default — it opens only when the user taps the prompt (or the
// Today hero calls open()) — so the Today hub isn't dominated by an always-expanded form that
// duplicates the hero's "Set today's intention" CTA.
const DailyIntentionCard = forwardRef<DailyIntentionCardHandle, DailyIntentionCardProps>(
  function DailyIntentionCard({ promptWhenClosed = true, defaultOpen = false }, ref) {
    const [intention, setIntentionState] = useState<DailyIntention | null>(() => getDailyIntention());
    const [editing, setEditing] = useState(() => defaultOpen && !getDailyIntention());
    const [ifText, setIfText] = useState(intention?.if ?? "");
    const [thenText, setThenText] = useState(intention?.then ?? "");
    const [justSaved, setJustSaved] = useState(false);

    const openForm = () => {
      setIfText(intention?.if ?? "");
      setThenText(intention?.then ?? "");
      setEditing(true);
    };

    useImperativeHandle(ref, () => ({ open: openForm }), [intention]);

    const handleSave = () => {
      const result = setDailyIntention(ifText, thenText);
      if (!result) return; // blank field(s) — no-op, keep the form open for the user to finish
      setIntentionState(result);
      setEditing(false);
      void hapticMedium();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    };

    // Saved & closed → the compact review/edit summary (the SAME canonical store DiaryCardScreen's
    // Part 3 reads/writes, so the two stay in sync).
    if (intention && !editing) {
      return (
        <div
          id="today-daily-intention"
          className="glass p-4 rounded-2xl border-l-4 border-l-amber-500/50 space-y-2 scroll-mt-24"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Today's intention</p>
          </div>
          <p className="text-sm text-slate-200">
            If <span className="font-semibold">{intention.if}</span>, then I will{" "}
            <span className="font-semibold">{intention.then}</span>.
          </p>
          <button
            onClick={openForm}
            className="text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
          >
            Edit
          </button>
        </div>
      );
    }

    // Unset & closed → a collapsed, tappable prompt (never the always-open form). When the hero is
    // already promoting this, stay silent and let the hero's open() drive the form — just keep the
    // scroll/focus anchor in the DOM so the hero can scroll to it.
    if (!intention && !editing) {
      if (!promptWhenClosed) {
        return <div id="today-daily-intention" className="scroll-mt-24" aria-hidden="true" />;
      }
      return (
        <button
          id="today-daily-intention"
          onClick={openForm}
          aria-expanded={false}
          className="w-full glass hover:brightness-125 p-4 rounded-2xl border-l-4 border-l-amber-500/50 transition-all active:scale-[0.99] cursor-pointer text-left flex items-center gap-3 scroll-mt-24"
        >
          <Target className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-100">Set today's intention</span>
            <span className="block text-[11px] text-slate-400">A tiny if-then plan — no pressure, just a nudge.</span>
          </span>
          <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
        </button>
      );
    }

    const canSave = ifText.trim().length > 0 && thenText.trim().length > 0;

    return (
      <div
        id="today-daily-intention"
        className="glass p-4 rounded-2xl border-l-4 border-l-amber-500/50 space-y-3 scroll-mt-24"
      >
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Set today's intention</p>
        </div>
        <p className="text-[11px] text-slate-500">
          A tiny if-then plan makes it more likely you'll follow through — no pressure, just a nudge.
        </p>
        <div className="space-y-2">
          <input
            type="text"
            value={ifText}
            onChange={(e) => setIfText(e.target.value)}
            placeholder="If… (e.g. I feel anxious after lunch)"
            aria-label="If"
            className="w-full bg-page border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
          <input
            type="text"
            value={thenText}
            onChange={(e) => setThenText(e.target.value)}
            placeholder="…then I will (e.g. do a 2-minute breathing exercise)"
            aria-label="Then"
            className="w-full bg-page border border-slate-800 rounded-lg p-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl sun-cta text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {justSaved && <Check className="w-4 h-4" aria-hidden="true" />}
          {justSaved ? "Saved" : "Save intention"}
        </button>
      </div>
    );
  },
);

export default DailyIntentionCard;
